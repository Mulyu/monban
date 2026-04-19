import fg from "../../ports/glob.js";
import type { CountRule, RuleResult } from "../../types.js";

export async function checkPathCount(
	rules: CountRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const base = rule.path.replace(/\/$/, "");
		const pattern = `${base}/*`;
		const ruleIgnore =
			rule.exclude?.map((e) => (e.includes("/") ? e : `${base}/${e}`)) ?? [];
		const files = await fg(pattern, {
			cwd,
			onlyFiles: true,
			dot: false,
			ignore: [...globalExclude, ...ruleIgnore],
		});

		const count = files.length;

		if (rule.max !== undefined && count > rule.max) {
			results.push({
				rule: "count",
				path: `${rule.path}/`,
				message: `ファイル数 ${count} が上限 ${rule.max} を超えています。`,
				severity: "error",
			});
		}

		if (rule.min !== undefined && count < rule.min) {
			results.push({
				rule: "count",
				path: `${rule.path}/`,
				message: `ファイル数 ${count} が下限 ${rule.min} を下回っています。`,
				severity: "error",
			});
		}
	}

	return results;
}
