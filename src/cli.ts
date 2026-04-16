import { Command } from "commander";
import { loadConfig } from "./config/loader.js";
import { hasErrors, reportResults } from "./reporter.js";
import { checkArch } from "./rules/arch.js";

export function createCli(): Command {
	const program = new Command();

	program
		.name("monban")
		.description("コーディングエージェントのための番所")
		.version("0.1.0");

	program
		.command("arch")
		.description(
			"アーキテクチャチェック: ファイル配置がルールに従っているか検証",
		)
		.action(async () => {
			const cwd = process.cwd();
			const config = await loadConfig(cwd);

			if (!config.arch) {
				console.log("No arch rules defined in monban.yml");
				return;
			}

			const results = await checkArch(config.arch, cwd);
			reportResults(results);

			if (hasErrors(results)) {
				process.exit(1);
			}
		});

	return program;
}
