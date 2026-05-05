import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import type { RuleResult } from "../../engine/types.js";
import { extractSpdxTag } from "./internal/spdx.js";
import type { LicenseHeaderRule } from "./types.js";

const DEFAULT_WITHIN_LINES = 10;

export async function checkLicenseHeader(
	rules: LicenseHeaderRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const severity = rule.severity ?? "warn";
		const within = rule.within_lines ?? DEFAULT_WITHIN_LINES;
		const files = await fg(rule.path, {
			cwd,
			dot: false,
			onlyFiles: true,
			ignore: [...globalExclude, ...(rule.exclude ?? [])],
		});

		for (const file of files) {
			const abs = join(cwd, file);
			const raw = await readFile(abs, "utf-8");
			const head = raw.split(/\r?\n/, within).join("\n");
			const id = extractSpdxTag(head);

			if (!id) {
				results.push({
					rule: "header",
					path: file,
					message:
						rule.message ??
						`先頭 ${within} 行に SPDX-License-Identifier ヘッダがありません。`,
					severity,
				});
				continue;
			}

			if (rule.allowed && !rule.allowed.includes(id)) {
				results.push({
					rule: "header",
					path: file,
					message:
						rule.message ??
						`未許可の SPDX-License-Identifier: ${id} (許可: ${rule.allowed.join(", ")})`,
					severity,
				});
			}
		}
	}

	return results;
}
