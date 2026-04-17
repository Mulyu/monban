import { Command } from "commander";
import { loadConfig } from "./config/loader.js";
import type { CategoryGroup } from "./reporter.js";
import {
	hasErrors,
	hasErrorsInGroups,
	reportActionsResults,
	reportAllResults,
	reportContentResults,
	reportDocResults,
	reportPathResults,
} from "./reporter.js";
import { ACTIONS_RULE_NAMES, runActionsRules } from "./rules/actions/index.js";
import { CONTENT_RULE_NAMES, runContentRules } from "./rules/content/index.js";
import { DOC_RULE_NAMES, runDocRules } from "./rules/doc/index.js";
import { RULE_NAMES, runPathRules } from "./rules/path/index.js";

export function createCli(): Command {
	const program = new Command();

	program
		.name("monban")
		.description("コーディングエージェントのための番所")
		.version("0.1.0");

	program
		.command("all")
		.description("全チェック: すべてのチェックを一括実行")
		.option("--json", "JSON 出力")
		.action(async (opts: { json?: boolean }) => {
			const cwd = process.cwd();
			const config = await loadConfig(cwd);
			const globalExclude = config.exclude ?? [];
			const groups: CategoryGroup[] = [];

			if (config.path) {
				const results = await runPathRules(config.path, cwd, globalExclude);
				groups.push({ category: "path", results });
			}

			if (config.content) {
				const results = await runContentRules(
					config.content,
					cwd,
					globalExclude,
				);
				groups.push({ category: "content", results });
			}

			if (config.doc) {
				const results = await runDocRules(config.doc, cwd, globalExclude);
				groups.push({ category: "doc", results });
			}

			if (config.actions) {
				const results = await runActionsRules(
					config.actions,
					cwd,
					globalExclude,
				);
				groups.push({ category: "actions", results });
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
		.option("--json", "JSON 出力")
		.action(async (opts: { rule?: string; json?: boolean }) => {
			const cwd = process.cwd();
			const config = await loadConfig(cwd);

			if (!config.path) {
				console.log("No path rules defined in monban.yml");
				return;
			}

			const results = await runPathRules(
				config.path,
				cwd,
				config.exclude ?? [],
				opts.rule,
			);
			reportPathResults(results, opts.json ?? false);

			if (hasErrors(results)) {
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
		.option("--json", "JSON 出力")
		.action(async (opts: { rule?: string; json?: boolean }) => {
			const cwd = process.cwd();
			const config = await loadConfig(cwd);

			if (!config.content) {
				console.log("No content rules defined in monban.yml");
				return;
			}

			const results = await runContentRules(
				config.content,
				cwd,
				config.exclude ?? [],
				opts.rule,
			);
			reportContentResults(results, opts.json ?? false);

			if (hasErrors(results)) {
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
		.option("--json", "JSON 出力")
		.action(async (opts: { rule?: string; json?: boolean }) => {
			const cwd = process.cwd();
			const config = await loadConfig(cwd);

			if (!config.doc) {
				console.log("No doc rules defined in monban.yml");
				return;
			}

			const results = await runDocRules(
				config.doc,
				cwd,
				config.exclude ?? [],
				opts.rule,
			);
			reportDocResults(results, opts.json ?? false);

			if (hasErrors(results)) {
				process.exit(1);
			}
		});

	program
		.command("actions")
		.description(
			"GitHub Actions チェック: ピン留め・必須ワークフロー・禁止アクションを検証",
		)
		.option(
			"--rule <name>",
			`特定ルールのみ実行 (${ACTIONS_RULE_NAMES.join(", ")})`,
		)
		.option("--json", "JSON 出力")
		.action(async (opts: { rule?: string; json?: boolean }) => {
			const cwd = process.cwd();
			const config = await loadConfig(cwd);

			if (!config.actions) {
				console.log("No actions rules defined in monban.yml");
				return;
			}

			const results = await runActionsRules(
				config.actions,
				cwd,
				config.exclude ?? [],
				opts.rule,
			);
			reportActionsResults(results, opts.json ?? false);

			if (hasErrors(results)) {
				process.exit(1);
			}
		});

	return program;
}
