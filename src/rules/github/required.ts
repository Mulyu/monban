import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import type { GithubRequiredRule, RuleResult } from "../../types.js";
import { extractStepUses } from "./workflow.js";

export async function checkGithubRequired(
	rules: GithubRequiredRule[],
	cwd: string,
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		if (rule.file) {
			const abs = join(cwd, rule.file);
			if (!existsSync(abs)) {
				results.push({
					rule: "required",
					path: rule.file,
					message: "必須ワークフローが見つかりません。",
					severity: "error",
				});
			}
		}

		if (rule.path && rule.steps) {
			const abs = join(cwd, rule.path);
			let content: string;
			try {
				content = await readFile(abs, "utf-8");
			} catch {
				results.push({
					rule: "required",
					path: rule.path,
					message: "ワークフローファイルが見つかりません。",
					severity: "error",
				});
				continue;
			}

			let doc: unknown;
			try {
				doc = parse(content);
			} catch {
				continue;
			}

			const usesEntries = extractStepUses(doc);
			for (const requiredStep of rule.steps) {
				const found = usesEntries.some((u) => u.startsWith(requiredStep));
				if (!found) {
					results.push({
						rule: "required",
						path: rule.path,
						message: `必須ステップが見つかりません: ${requiredStep}`,
						severity: "error",
					});
				}
			}
		}
	}

	return results;
}
