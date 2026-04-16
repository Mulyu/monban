import { Command } from "commander";
import { loadConfig } from "./config/loader.js";
import { hasErrors, reportPathResults } from "./reporter.js";
import { RULE_NAMES, runPathRules } from "./rules/path/index.js";

export function createCli(): Command {
	const program = new Command();

	program
		.name("monban")
		.description("コーディングエージェントのための番所")
		.version("0.1.0");

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

	return program;
}
