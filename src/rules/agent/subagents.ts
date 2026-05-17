import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { RuleResult } from "../../engine/types.js";
import { listAgentFiles } from "./internal/file-list.js";
import { extractFrontmatter } from "./internal/frontmatter.js";
import type { AgentSubagentsRule } from "./types.js";

export async function checkAgentSubagents(
	rules: AgentSubagentsRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const severity = rule.severity ?? "warn";
		const files = await listAgentFiles(rule, cwd, globalExclude);

		for (const file of files) {
			const abs = join(cwd, file);
			const content = await readFile(abs, "utf-8");
			const frontmatter = extractFrontmatter(content);

			if (frontmatter === null) {
				results.push({
					rule: "subagents",
					path: file,
					message:
						rule.message ??
						"subagent ファイルに frontmatter が見つかりません。",
					severity,
				});
				continue;
			}

			if (rule.required_frontmatter_keys) {
				for (const key of rule.required_frontmatter_keys) {
					if (!(key in frontmatter)) {
						results.push({
							rule: "subagents",
							path: file,
							message: rule.message ?? `frontmatter に必須キーが欠落: ${key}`,
							severity,
						});
					}
				}
			}

			if (rule.allowed_frontmatter_keys) {
				const allowed = new Set(rule.allowed_frontmatter_keys);
				for (const key of Object.keys(frontmatter)) {
					if (!allowed.has(key)) {
						results.push({
							rule: "subagents",
							path: file,
							message:
								rule.message ??
								`frontmatter に未許可のキー: ${key} (許可: ${rule.allowed_frontmatter_keys.join(", ")})`,
							severity,
						});
					}
				}
			}

			if (rule.allowed_models) {
				const model = frontmatter.model;
				if (typeof model === "string" && !rule.allowed_models.includes(model)) {
					results.push({
						rule: "subagents",
						path: file,
						message:
							rule.message ??
							`model が allowlist にありません: ${model} (許可: ${rule.allowed_models.join(", ")})`,
						severity,
					});
				}
			}
		}
	}

	return results;
}
