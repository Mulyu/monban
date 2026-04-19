import { basename, dirname } from "node:path";
import fg from "../../glob.js";
import type { PathCaseConflictRule, RuleResult } from "../../types.js";

export async function checkPathCaseConflict(
	rules: PathCaseConflictRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const files = await fg(rule.path, {
			cwd,
			dot: true,
			onlyFiles: false,
			markDirectories: false,
			ignore: [...globalExclude, ...(rule.exclude ?? [])],
		});

		// Group entries by (directory, lowercased basename); flag groups with more
		// than one distinct original name.
		const groups = new Map<string, Set<string>>();
		for (const file of files) {
			const dir = dirname(file);
			const base = basename(file);
			const key = `${dir}\0${base.toLowerCase()}`;
			let set = groups.get(key);
			if (!set) {
				set = new Set();
				groups.set(key, set);
			}
			set.add(base);
		}

		for (const [key, names] of groups) {
			if (names.size <= 1) continue;
			const dir = key.split("\0")[0];
			const sorted = [...names].sort();
			results.push({
				rule: "case_conflict",
				path: dir === "." ? sorted.join(", ") : `${dir}/{${sorted.join(", ")}}`,
				message:
					rule.message ??
					`大文字小文字違いで衝突するパス: ${sorted.join(", ")}`,
				severity: rule.severity ?? "error",
			});
		}
	}

	return results;
}
