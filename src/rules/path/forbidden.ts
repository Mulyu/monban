import fg from "fast-glob";
import type { ForbiddenRule, RuleResult } from "../../types.js";

export async function checkPathForbidden(
	rules: ForbiddenRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const matches = await fg(rule.path, {
			cwd,
			dot: false,
			onlyFiles: false,
			markDirectories: true,
			ignore: globalExclude,
		});

		for (const match of matches) {
			results.push({
				rule: "forbidden",
				path: match,
				message: rule.message ?? `禁止パターンに一致しました: ${rule.path}`,
				severity: rule.severity ?? "error",
			});
		}
	}

	return results;
}
