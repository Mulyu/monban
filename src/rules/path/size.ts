import { stat } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import type { PathSizeRule, RuleResult } from "../../types.js";

export async function checkPathSize(
	rules: PathSizeRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const files = await fg(rule.path, {
			cwd,
			dot: true,
			onlyFiles: true,
			ignore: [...globalExclude, ...(rule.exclude ?? [])],
		});

		for (const file of files) {
			const info = await stat(join(cwd, file));
			if (info.size > rule.max_bytes) {
				results.push({
					rule: "size",
					path: file,
					message:
						rule.message ??
						`サイズ ${formatBytes(info.size)} が上限 ${formatBytes(rule.max_bytes)} を超えています。`,
					severity: rule.severity ?? "error",
					fail_text: rule.fail_text,
					docs_url: rule.docs_url,
				});
			}
		}
	}

	return results;
}

function formatBytes(n: number): string {
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
	return `${(n / (1024 * 1024)).toFixed(1)} MiB`;
}
