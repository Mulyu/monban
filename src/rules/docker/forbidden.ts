import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import type { RuleResult } from "../../types.js";
import { parseDockerfile } from "./internal/dockerfile.js";
import type { DockerForbiddenRule } from "./types.js";

export async function checkDockerForbidden(
	rules: DockerForbiddenRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const severity = rule.severity ?? "error";
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

			for (const entry of rule.instructions) {
				const target = entry.name.toUpperCase();
				const matched = instructions.filter((i) => i.name === target);
				if (matched.length === 0) continue;

				const re = entry.pattern ? new RegExp(entry.pattern) : null;

				for (const ins of matched) {
					if (re && !re.test(ins.args)) continue;
					results.push({
						rule: "forbidden",
						path: file,
						message:
							entry.message ??
							(re
								? `${target} ${ins.args} はパターン /${entry.pattern}/ に一致するため禁止されています (line ${ins.line})。`
								: `${target} 命令は禁止されています (line ${ins.line})。`),
						severity,
					});
				}
			}
		}
	}

	return results;
}
