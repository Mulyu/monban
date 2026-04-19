import { relative } from "node:path";
import fg from "fast-glob";
import type { DepthRule, RuleResult } from "../../types.js";

export async function checkPathDepth(
	rules: DepthRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const basePath = rule.path.replace(/\/$/, "");
		const pattern = `${basePath}/**`;
		const entries = await fg(pattern, {
			cwd,
			dot: false,
			onlyFiles: true,
			ignore: globalExclude,
		});

		for (const entry of entries) {
			const rel = relative(basePath, entry);
			const depth = rel.split("/").length - 1;

			if (depth > rule.max) {
				results.push({
					rule: "depth",
					path: entry,
					message: `深度 ${depth} は上限 ${rule.max} を超えています (基準: ${basePath}/)`,
					severity: "error",
					fail_text: rule.fail_text,
					docs_url: rule.docs_url,
				});
			}
		}
	}

	return results;
}
