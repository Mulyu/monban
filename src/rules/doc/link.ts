import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import fg from "fast-glob";
import type { DocLinkRule, RuleResult } from "../../types.js";

const MD_LINK = /\[(?:[^\]]*)\]\(([^)]+)\)/g;

export async function checkDocLink(
	rules: DocLinkRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const files = await fg(rule.path, {
			cwd,
			dot: false,
			onlyFiles: true,
			ignore: globalExclude,
		});

		for (const file of files) {
			const abs = join(cwd, file);
			const content = await readFile(abs, "utf-8");
			const lines = content.split("\n");
			let inCodeBlock = false;

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				const lineNum = i + 1;

				if (line.trimStart().startsWith("```")) {
					inCodeBlock = !inCodeBlock;
					continue;
				}
				if (inCodeBlock) continue;

				for (const match of line.matchAll(MD_LINK)) {
					const href = match[1];

					if (isExternal(href) || isAnchorOnly(href)) {
						continue;
					}

					const linkPath = href.split("#")[0];
					if (!linkPath) continue;

					const target = resolve(dirname(abs), linkPath);
					if (!existsSync(target)) {
						results.push({
							rule: "link",
							path: `${file}:${lineNum}`,
							message: `リンク切れ: ${href}`,
							severity: "error",
						});
					}
				}
			}
		}
	}

	return results;
}

function isExternal(href: string): boolean {
	return /^https?:\/\/|^mailto:|^ftp:\/\//.test(href);
}

function isAnchorOnly(href: string): boolean {
	return href.startsWith("#");
}
