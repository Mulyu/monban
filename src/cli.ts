import { Command } from "commander";
import { loadConfig } from "./config/loader.js";
import {
	type Category,
	type OrchestratorOpts,
	runAll,
	runCategory,
} from "./orchestrator.js";
import {
	hasErrors,
	hasErrorsInGroups,
	reportAllResults,
	reportCategory,
} from "./reporter.js";
import { CONTENT_RULE_NAMES } from "./rules/content/index.js";
import { DEPS_RULE_NAMES } from "./rules/deps/index.js";
import { DOC_RULE_NAMES } from "./rules/doc/index.js";
import { GIT_RULE_NAMES } from "./rules/git/index.js";
import { GITHUB_RULE_NAMES } from "./rules/github/index.js";
import { RULE_NAMES as PATH_RULE_NAMES } from "./rules/path/index.js";

interface CommonOpts extends OrchestratorOpts {
	json?: boolean;
}

const RULE_NAMES_BY_CATEGORY: Record<Category, readonly string[]> = {
	path: PATH_RULE_NAMES,
	content: CONTENT_RULE_NAMES,
	doc: DOC_RULE_NAMES,
	github: GITHUB_RULE_NAMES,
	deps: DEPS_RULE_NAMES,
	git: GIT_RULE_NAMES,
};

async function runSingle(category: Category, opts: CommonOpts): Promise<void> {
	const cwd = process.cwd();
	const config = await loadConfig(cwd);
	const group = await runCategory(cwd, category, config, opts);
	if (!group) {
		console.log(`No ${category} rules defined in monban.yml`);
		return;
	}
	reportCategory(category, group.results, opts.json ?? false);
	if (hasErrors(group.results)) {
		process.exit(1);
	}
}

function addDiffOptions(cmd: Command): Command {
	return cmd
		.option("--diff [ref]", "PR 差分のみ検査（base ref を指定）")
		.option("--diff-granularity <mode>", "diff 粒度 (file | line)", "file")
		.option("--json", "JSON 出力");
}

function addCategoryCommand(
	program: Command,
	category: Category,
	description: string,
	extraSetup?: (cmd: Command) => void,
): void {
	const cmd = program
		.command(category)
		.description(description)
		.option(
			"--rule <name>",
			`特定ルールのみ実行 (${RULE_NAMES_BY_CATEGORY[category].join(", ")})`,
		);
	extraSetup?.(cmd);
	addDiffOptions(cmd).action(async (opts: CommonOpts) =>
		runSingle(category, opts),
	);
}

export function createCli(): Command {
	const program = new Command();

	program
		.name("monban")
		.description("コーディングエージェントのための番所")
		.version("0.1.0");

	const all = program
		.command("all")
		.description("全チェック: すべてのチェックを一括実行")
		.option(
			"--offline",
			"deps は allowed/denied のみ実行（ネットワーク通信なし）",
		);
	addDiffOptions(all).action(async (opts: CommonOpts) => {
		const cwd = process.cwd();
		const config = await loadConfig(cwd);
		const groups = await runAll(cwd, config, opts);
		if (groups.length === 0) {
			console.log("No rules defined in monban.yml");
			return;
		}
		reportAllResults(groups, opts.json ?? false);
		if (hasErrorsInGroups(groups)) {
			process.exit(1);
		}
	});

	addCategoryCommand(
		program,
		"path",
		"パスチェック: ファイル・ディレクトリの存在、命名、深度、数を検証",
	);
	addCategoryCommand(
		program,
		"content",
		"コンテンツチェック: ファイル内容の禁止・必須パターン・行数を検証",
	);
	addCategoryCommand(
		program,
		"doc",
		"ドキュメントチェック: 参照整合性・リンク切れを検証",
	);
	addCategoryCommand(
		program,
		"github",
		"GitHub チェック: workflows と CODEOWNERS の構造を検証",
	);
	addCategoryCommand(
		program,
		"deps",
		"依存チェック: マニフェストの依存名をレジストリで検証（実在・鮮度・人気度・類似性）",
		(cmd) => {
			cmd.option(
				"--offline",
				"ネットワーク通信をせず allowed / denied のみ実行",
			);
		},
	);
	addCategoryCommand(
		program,
		"git",
		"Git チェック: コミットメッセージ・trailer・Issue 参照・変更粒度・ignore すり抜けを検証",
	);

	return program;
}
