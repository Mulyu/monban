import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fg from "../../glob.js";
import type { PathHashRule, RuleResult } from "../../types.js";

export async function checkPathHash(
	rules: PathHashRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const expected = rule.sha256.toLowerCase();
		const files = await fg(rule.path, {
			cwd,
			dot: true,
			onlyFiles: true,
			ignore: globalExclude,
		});

		if (files.length === 0) {
			results.push({
				rule: "hash",
				path: rule.path,
				message:
					rule.message ?? `ハッシュ照合対象が見つかりません: ${rule.path}`,
				severity: rule.severity ?? "error",
			});
			continue;
		}

		for (const file of files) {
			const buf = await readFile(join(cwd, file));
			const actual = createHash("sha256").update(buf).digest("hex");
			if (actual !== expected) {
				results.push({
					rule: "hash",
					path: file,
					message:
						rule.message ??
						`ハッシュ不一致: expected ${expected.slice(0, 12)}... actual ${actual.slice(0, 12)}...`,
					severity: rule.severity ?? "error",
				});
			}
		}
	}

	return results;
}
