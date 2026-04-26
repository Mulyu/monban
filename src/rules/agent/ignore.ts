import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { AgentIgnoreRule, RuleResult } from "../../types.js";
import { listAgentFiles } from "./internal/file-list.js";

const DEFAULT_REQUIRED = [
	".env",
	".env.*",
	"*.pem",
	"id_rsa",
	"id_rsa.*",
	"**/secrets/**",
];

export async function checkAgentIgnore(
	rules: AgentIgnoreRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const severity = rule.severity ?? "warn";
		const required = rule.required ?? DEFAULT_REQUIRED;

		const files = await listAgentFiles(rule, cwd, globalExclude);

		if (files.length === 0) {
			results.push({
				rule: "ignore",
				path: rule.path,
				message:
					rule.message ?? `AI ignore ファイルが見つかりません: ${rule.path}`,
				severity,
			});
			continue;
		}

		for (const file of files) {
			const abs = join(cwd, file);
			const content = await readFile(abs, "utf-8");
			const patterns = parseIgnore(content);
			for (const pattern of required) {
				if (!patterns.has(pattern)) {
					results.push({
						rule: "ignore",
						path: file,
						message:
							rule.message ??
							`必須カバレッジが欠落: ${pattern} が ignore リストに含まれていません。`,
						severity,
					});
				}
			}
		}
	}

	return results;
}

function parseIgnore(content: string): Set<string> {
	const set = new Set<string>();
	for (const raw of content.split("\n")) {
		const line = raw.split("#")[0].trim();
		if (line.length === 0) continue;
		// negation lines (`!pattern`) revert ignores; we store original sans `!`
		const cleaned = line.startsWith("!") ? line.slice(1) : line;
		set.add(cleaned);
	}
	return set;
}
