import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import type { ContentSizeRule, RuleResult } from "../../types.js";

export async function checkContentSize(
	rules: ContentSizeRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const files = await fg(rule.path, {
			cwd,
			dot: false,
			onlyFiles: true,
			ignore: [...globalExclude, ...(rule.exclude ?? [])],
		});

		for (const file of files) {
			const abs = join(cwd, file);
			const content = await readFile(abs, "utf-8");
			const lines = countLines(content);
			if (lines > rule.max_lines) {
				results.push({
					rule: "size",
					path: file,
					message:
						rule.message ??
						`行数 ${lines} が上限 ${rule.max_lines} を超えています。`,
					severity: rule.severity ?? "error",
				});
			}
		}
	}

	return results;
}

function countLines(content: string): number {
	if (content.length === 0) return 0;
	const trimmed = content.endsWith("\n") ? content.slice(0, -1) : content;
	return trimmed.split("\n").length;
}
