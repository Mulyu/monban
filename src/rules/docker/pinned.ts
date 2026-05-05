import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import type { RuleResult } from "../../engine/types.js";
import { parseDockerfile, parseFromArgs } from "./internal/dockerfile.js";
import type { DockerPinnedRule } from "./types.js";

export async function checkDockerPinned(
	rules: DockerPinnedRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const severity = rule.severity ?? "error";
		const requireDigest = rule.digest ?? false;
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

			const knownStages = new Set<string>();
			for (const ins of instructions) {
				if (ins.name !== "FROM") continue;
				const from = parseFromArgs(ins.args, knownStages);
				if (from.stageAlias) knownStages.add(from.stageAlias);
				if (from.stageReference) continue;

				if (requireDigest) {
					if (!from.digest) {
						results.push({
							rule: "pinned",
							path: file,
							message:
								rule.message ??
								`FROM ${from.raw} は digest でピン留めされていません (line ${ins.line})。@sha256:... が必要です。`,
							severity,
						});
					}
					continue;
				}

				if (from.digest) continue;
				if (!from.tag) {
					results.push({
						rule: "pinned",
						path: file,
						message:
							rule.message ??
							`FROM ${from.raw} にタグがありません (line ${ins.line})。タグまたは digest でピン留めしてください。`,
						severity,
					});
					continue;
				}
				if (from.tag === "latest") {
					results.push({
						rule: "pinned",
						path: file,
						message:
							rule.message ??
							`FROM ${from.raw} は :latest を使用しています (line ${ins.line})。具体的なタグまたは digest にしてください。`,
						severity,
					});
				}
			}
		}
	}

	return results;
}
