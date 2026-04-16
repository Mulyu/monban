import fg from "fast-glob";
import type { CountRule, RuleResult } from "../../types.js";

const DEFAULT_WARN_RATIO = 0.8;

export async function checkCount(
	rules: CountRule[],
	cwd: string,
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const base = rule.path.replace(/\/$/, "");
		const pattern = `${base}/*`;
		const ignore = rule.exclude?.map((e) =>
			e.includes("/") ? e : `${base}/${e}`,
		);
		const files = await fg(pattern, {
			cwd,
			onlyFiles: true,
			dot: false,
			ignore,
		});

		const count = files.length;

		if (count > rule.max) {
			results.push({
				rule: "count",
				path: `${rule.path}/`,
				message: `ファイル数 ${count} が上限 ${rule.max} を超えています。`,
				severity: "error",
			});
		} else if (count >= rule.max * DEFAULT_WARN_RATIO) {
			const pct = Math.round((count / rule.max) * 100);
			results.push({
				rule: "count",
				path: `${rule.path}/`,
				message: `ファイル数 ${count} / 上限 ${rule.max}（${pct}%）`,
				severity: "warn",
			});
		}
	}

	return results;
}
