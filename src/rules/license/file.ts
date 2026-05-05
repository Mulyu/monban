import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import type { LicenseFileRule, RuleResult } from "../../types.js";
import { detectLicenseFromText } from "./internal/spdx.js";

export async function checkLicenseFile(
	rules: LicenseFileRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const severity = rule.severity ?? "error";
		const files = await fg(rule.path, {
			cwd,
			dot: false,
			onlyFiles: true,
			ignore: globalExclude,
		});

		if (files.length === 0) {
			results.push({
				rule: "file",
				path: rule.path,
				message:
					rule.message ??
					`LICENSE ファイルが見つかりません (path: ${rule.path})`,
				severity,
			});
			continue;
		}

		for (const file of files) {
			const abs = join(cwd, file);
			const raw = await readFile(abs, "utf-8");
			const detected = detectLicenseFromText(raw);

			if (!detected) {
				results.push({
					rule: "file",
					path: file,
					message:
						rule.message ??
						"ライセンスを判別できませんでした。SPDX-License-Identifier タグを記載するか、既知のライセンステンプレートを使用してください。",
					severity,
				});
				continue;
			}

			if (rule.allowed && !rule.allowed.includes(detected.id)) {
				results.push({
					rule: "file",
					path: file,
					message:
						rule.message ??
						`未許可のライセンスです: ${detected.id} (許可: ${rule.allowed.join(", ")})`,
					severity,
				});
			}
		}
	}

	return results;
}
