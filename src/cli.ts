import { Command } from "commander";
import { loadConfig } from "./config/loader.js";
import { applyDiffFilter, computeDiffScope } from "./diff.js";
import type { CategoryGroup } from "./reporter.js";
import {
	hasErrors,
	hasErrorsInGroups,
	reportAllResults,
	reportContentResults,
	reportDepsResults,
	reportDocResults,
	reportGithubResults,
	reportPathResults,
} from "./reporter.js";
import {
	CONTENT_RULE_NAMES,
	type ContentRuleResult,
	runContentRules,
} from "./rules/content/index.js";
import {
	DEPS_RULE_NAMES,
	type DepsRuleResult,
	runDepsRules,
} from "./rules/deps/index.js";
import {
	DOC_RULE_NAMES,
	type DocRuleResult,
	runDocRules,
} from "./rules/doc/index.js";
import {
	GITHUB_RULE_NAMES,
	type GithubRuleResult,
	runGithubRules,
} from "./rules/github/index.js";
import {
	type PathRuleResult,
	RULE_NAMES,
	runPathRules,
} from "./rules/path/index.js";
import type { DiffGranularity, DiffScope } from "./types.js";

interface DiffOpts {
	diff?: string | boolean;
	diffGranularity?: string;
}

interface CommonOpts extends DiffOpts {
	json?: boolean;
	rule?: string;
}

interface DepsOpts extends CommonOpts {
	offline?: boolean;
}

function resolveDiffScope(cwd: string, opts: DiffOpts): DiffScope | null {
	if (opts.diff === undefined) return null;
	const base = typeof opts.diff === "string" ? opts.diff : undefined;
	const granularity = normalizeGranularity(opts.diffGranularity);
	const scope = computeDiffScope(cwd, { base, granularity });
	if (!scope) {
		console.error(
			"warn: --diff was specified but no diff base could be resolved; running full scan.",
		);
		return null;
	}
	return scope;
}

function normalizeGranularity(raw: string | undefined): DiffGranularity {
	if (raw === "line") return "line";
	return "file";
}

type AnyRuleResult =
	| PathRuleResult
	| ContentRuleResult
	| DocRuleResult
	| GithubRuleResult
	| DepsRuleResult;

function filterResults<T extends AnyRuleResult>(
	results: T[],
	scope: DiffScope | null,
): T[] {
	if (!scope) return results;
	return results.map(
		(r) => ({ ...r, results: applyDiffFilter(r.results, scope) }) as T,
	);
}

export function createCli(): Command {
	const program = new Command();

	program
		.name("monban")
		.description("コーディングエージェントのための番所")
		.version("0.1.0");

	program
		.command("all")
		.description("全チェック: すべてのチェックを一括実行")
		.option("--diff [ref]", "PR 差分のみ検査（base ref を指定）")
		.option("--diff-granularity <mode>", "diff 粒度 (file | line)", "file")
		.option(
			"--offline",
			"deps は allowed/denied のみ実行（ネットワーク通信なし）",
		)
		.option("--json", "JSON 出力")
		.action(async (opts: DepsOpts) => {
			const cwd = process.cwd();
			const config = await loadConfig(cwd);
			const globalExclude = config.exclude ?? [];
			const scope = resolveDiffScope(cwd, opts);
			const groups: CategoryGroup[] = [];

			if (config.path) {
				const results = await runPathRules(config.path, cwd, globalExclude);
				groups.push({
					category: "path",
					results: filterResults(results, scope),
				});
			}

			if (config.content) {
				const results = await runContentRules(
					config.content,
					cwd,
					globalExclude,
				);
				groups.push({
					category: "content",
					results: filterResults(results, scope),
				});
			}

			if (config.doc) {
				const results = await runDocRules(config.doc, cwd, globalExclude);
				groups.push({
					category: "doc",
					results: filterResults(results, scope),
				});
			}

			if (config.github) {
				const results = await runGithubRules(config.github, cwd, globalExclude);
				groups.push({
					category: "github",
					results: filterResults(results, scope),
				});
			}

			if (config.deps) {
				const results = await runDepsRules(
					config.deps,
					cwd,
					globalExclude,
					undefined,
					{ offline: opts.offline },
				);
				groups.push({
					category: "deps",
					results: filterResults(results, scope),
				});
			}

			if (groups.length === 0) {
				console.log("No rules defined in monban.yml");
				return;
			}

			reportAllResults(groups, opts.json ?? false);

			if (hasErrorsInGroups(groups)) {
				process.exit(1);
			}
		});

	program
		.command("path")
		.description(
			"パスチェック: ファイル・ディレクトリの存在、命名、深度、数を検証",
		)
		.option("--rule <name>", `特定ルールのみ実行 (${RULE_NAMES.join(", ")})`)
		.option("--diff [ref]", "PR 差分のみ検査（base ref を指定）")
		.option("--diff-granularity <mode>", "diff 粒度 (file | line)", "file")
		.option("--json", "JSON 出力")
		.action(async (opts: CommonOpts) => {
			const cwd = process.cwd();
			const config = await loadConfig(cwd);

			if (!config.path) {
				console.log("No path rules defined in monban.yml");
				return;
			}

			const scope = resolveDiffScope(cwd, opts);
			const results = await runPathRules(
				config.path,
				cwd,
				config.exclude ?? [],
				opts.rule,
			);
			const filtered = filterResults(results, scope);
			reportPathResults(filtered, opts.json ?? false);

			if (hasErrors(filtered)) {
				process.exit(1);
			}
		});

	program
		.command("content")
		.description("コンテンツチェック: ファイル内容の禁止・必須パターンを検証")
		.option(
			"--rule <name>",
			`特定ルールのみ実行 (${CONTENT_RULE_NAMES.join(", ")})`,
		)
		.option("--diff [ref]", "PR 差分のみ検査（base ref を指定）")
		.option("--diff-granularity <mode>", "diff 粒度 (file | line)", "file")
		.option("--json", "JSON 出力")
		.action(async (opts: CommonOpts) => {
			const cwd = process.cwd();
			const config = await loadConfig(cwd);

			if (!config.content) {
				console.log("No content rules defined in monban.yml");
				return;
			}

			const scope = resolveDiffScope(cwd, opts);
			const results = await runContentRules(
				config.content,
				cwd,
				config.exclude ?? [],
				opts.rule,
			);
			const filtered = filterResults(results, scope);
			reportContentResults(filtered, opts.json ?? false);

			if (hasErrors(filtered)) {
				process.exit(1);
			}
		});

	program
		.command("doc")
		.description("ドキュメントチェック: 参照整合性・リンク切れを検証")
		.option(
			"--rule <name>",
			`特定ルールのみ実行 (${DOC_RULE_NAMES.join(", ")})`,
		)
		.option("--diff [ref]", "PR 差分のみ検査（base ref を指定）")
		.option("--diff-granularity <mode>", "diff 粒度 (file | line)", "file")
		.option("--json", "JSON 出力")
		.action(async (opts: CommonOpts) => {
			const cwd = process.cwd();
			const config = await loadConfig(cwd);

			if (!config.doc) {
				console.log("No doc rules defined in monban.yml");
				return;
			}

			const scope = resolveDiffScope(cwd, opts);
			const results = await runDocRules(
				config.doc,
				cwd,
				config.exclude ?? [],
				opts.rule,
			);
			const filtered = filterResults(results, scope);
			reportDocResults(filtered, opts.json ?? false);

			if (hasErrors(filtered)) {
				process.exit(1);
			}
		});

	program
		.command("github")
		.description("GitHub チェック: workflows と CODEOWNERS の構造を検証")
		.option(
			"--rule <name>",
			`特定ルールのみ実行 (${GITHUB_RULE_NAMES.join(", ")})`,
		)
		.option("--diff [ref]", "PR 差分のみ検査（base ref を指定）")
		.option("--diff-granularity <mode>", "diff 粒度 (file | line)", "file")
		.option("--json", "JSON 出力")
		.action(async (opts: CommonOpts) => {
			const cwd = process.cwd();
			const config = await loadConfig(cwd);

			if (!config.github) {
				console.log("No github rules defined in monban.yml");
				return;
			}

			const scope = resolveDiffScope(cwd, opts);
			const results = await runGithubRules(
				config.github,
				cwd,
				config.exclude ?? [],
				opts.rule,
			);
			const filtered = filterResults(results, scope);
			reportGithubResults(filtered, opts.json ?? false);

			if (hasErrors(filtered)) {
				process.exit(1);
			}
		});

	program
		.command("deps")
		.description(
			"依存チェック: マニフェストの依存名をレジストリで検証（実在・鮮度・人気度・類似性）",
		)
		.option(
			"--rule <name>",
			`特定ルールのみ実行 (${DEPS_RULE_NAMES.join(", ")})`,
		)
		.option("--offline", "ネットワーク通信をせず allowed / denied のみ実行")
		.option("--diff [ref]", "PR 差分のみ検査（base ref を指定）")
		.option("--diff-granularity <mode>", "diff 粒度 (file | line)", "file")
		.option("--json", "JSON 出力")
		.action(async (opts: DepsOpts) => {
			const cwd = process.cwd();
			const config = await loadConfig(cwd);

			if (!config.deps) {
				console.log("No deps rules defined in monban.yml");
				return;
			}

			const scope = resolveDiffScope(cwd, opts);
			const results = await runDepsRules(
				config.deps,
				cwd,
				config.exclude ?? [],
				opts.rule,
				{ offline: opts.offline },
			);
			const filtered = filterResults(results, scope);
			reportDepsResults(filtered, opts.json ?? false);

			if (hasErrors(filtered)) {
				process.exit(1);
			}
		});

	return program;
}
