import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import type { RuleResult } from "../../engine/types.js";
import { parseDockerfile } from "./internal/dockerfile.js";
import type { DockerUserRule } from "./types.js";

const DEFAULT_FORBIDDEN = ["root", "0", "0:0"];

export async function checkDockerUser(
	rules: DockerUserRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const severity = rule.severity ?? "error";
		const required = rule.required ?? true;
		const forbidden = rule.forbidden ?? DEFAULT_FORBIDDEN;
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

			const userInstructions = instructions.filter((i) => i.name === "USER");

			if (required && userInstructions.length === 0) {
				results.push({
					rule: "user",
					path: file,
					message:
						rule.message ??
						"USER ディレクティブがありません。非 root ユーザーを明示してください。",
					severity,
				});
				continue;
			}

			for (const ins of userInstructions) {
				const userArg = ins.args.split(/\s+/)[0] ?? "";
				const normalized = userArg.toLowerCase();
				if (forbidden.some((f) => f.toLowerCase() === normalized)) {
					results.push({
						rule: "user",
						path: file,
						message:
							rule.message ??
							`USER ${userArg} は禁止されています (line ${ins.line})。`,
						severity,
					});
				}
			}
		}
	}

	return results;
}
