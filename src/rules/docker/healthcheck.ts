import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import type { RuleResult } from "../../engine/types.js";
import { parseDockerfile } from "./internal/dockerfile.js";
import type { DockerHealthcheckRule } from "./types.js";

export async function checkDockerHealthcheck(
	rules: DockerHealthcheckRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const severity = rule.severity ?? "warn";
		const required = rule.required ?? true;
		const files = await fg(rule.path, {
			cwd,
			dot: false,
			onlyFiles: true,
			ignore: [...globalExclude, ...(rule.exclude ?? [])],
		});

		for (const file of files) {
			const abs = join(cwd, file);
			const raw = await readFile(abs, "utf-8");
			const instructions = parseDockerfile(raw);

			const healthchecks = instructions.filter((i) => i.name === "HEALTHCHECK");
			const effective = healthchecks.filter(
				(i) => !/^NONE\b/i.test(i.args.trim()),
			);

			if (required && effective.length === 0) {
				results.push({
					rule: "healthcheck",
					path: file,
					message:
						rule.message ??
						"HEALTHCHECK ディレクティブがありません (HEALTHCHECK NONE は無効と見なします)。",
					severity,
				});
			}
		}
	}

	return results;
}
