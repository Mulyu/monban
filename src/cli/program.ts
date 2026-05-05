import { Command } from "commander";
import { loadConfig } from "../config/loader.js";
import {
	type OrchestratorOpts,
	runAll,
	runCategory,
} from "../engine/orchestrator.js";
import type { Check } from "../engine/types.js";
import { CHECKS } from "../rules/index.js";
import {
	hasErrors,
	hasErrorsInGroups,
	reportAllResults,
	reportCategory,
} from "./reporter.js";

interface CommonOpts extends OrchestratorOpts {
	json?: boolean;
}

async function runSingle(category: string, opts: CommonOpts): Promise<void> {
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

function addCheckCommand(program: Command, check: Check): void {
	const cmd = program
		.command(check.category)
		.description(check.description)
		.option(
			"--rule <name>",
			`特定ルールのみ実行 (${check.ruleNames.join(", ")})`,
		);
	if (check.category === "deps") {
		cmd.option(
			"--offline",
			"ネットワーク通信をせず allowed / forbidden のみ実行",
		);
	}
	addDiffOptions(cmd).action(async (opts: CommonOpts) =>
		runSingle(check.category, opts),
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
			"deps は allowed/forbidden のみ実行（ネットワーク通信なし）",
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

	for (const check of CHECKS) {
		addCheckCommand(program, check);
	}

	return program;
}
