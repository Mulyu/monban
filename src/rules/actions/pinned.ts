import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import { parse } from "yaml";
import type { ActionsPinnedRule, RuleResult } from "../../types.js";
import { extractUses } from "./utils.js";

const COMMIT_HASH = /^[0-9a-f]{40}$/;

export async function checkActionsPinned(
	rules: ActionsPinnedRule[],
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
				if (uses.startsWith("./") || uses.startsWith("docker://")) {
					continue;
				}

				const atIndex = uses.lastIndexOf("@");
				if (atIndex === -1) {
					results.push({
						rule: "pinned",
						path: file,
						message: `ハッシュ固定されていません: ${uses}`,
						severity: "error",
					});
					continue;
				}

				const ref = uses.slice(atIndex + 1);
				if (!COMMIT_HASH.test(ref)) {
					results.push({
						rule: "pinned",
						path: file,
						message: `ハッシュ固定されていません: ${uses}`,
						severity: "error",
					});
				}
			}
		}
	}

	return results;
}
