import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import { parse } from "yaml";
import type { ActionsForbiddenRule, RuleResult } from "../../types.js";
import { extractUses } from "./utils.js";

export async function checkActionsForbidden(
	rules: ActionsForbiddenRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const files = await fg(rule.path, {
			cwd,
			dot: true,
			onlyFiles: true,
			ignore: globalExclude,
		});

		for (const file of files) {
			const abs = join(cwd, file);
			const content = await readFile(abs, "utf-8");
			let doc: unknown;
			try {
				doc = parse(content);
			} catch {
				continue;
			}

			const usesEntries = extractUses(doc);
			for (const uses of usesEntries) {
				if (uses.startsWith(rule.uses)) {
					results.push({
						rule: "forbidden",
						path: file,
						message: rule.message ?? `禁止アクション検出: ${uses}`,
						severity: rule.severity ?? "error",
					});
				}
			}
		}
	}

	return results;
}
