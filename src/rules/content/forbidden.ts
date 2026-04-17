import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import type { ContentForbiddenRule, RuleResult } from "../../types.js";

const INVISIBLE_CHARS: [string, number, string][] = [
	["\u200B", 0x200b, "Zero Width Space"],
	["\u200C", 0x200c, "Zero Width Non-Joiner"],
	["\u200D", 0x200d, "Zero Width Joiner"],
	["\u2060", 0x2060, "Word Joiner"],
	["\u00AD", 0x00ad, "Soft Hyphen"],
	["\uFEFF", 0xfeff, "Zero Width No-Break Space"],
	["\u2061", 0x2061, "Function Application"],
	["\u2062", 0x2062, "Invisible Times"],
	["\u2063", 0x2063, "Invisible Separator"],
	["\u2064", 0x2064, "Invisible Plus"],
];

const INVISIBLE_REGEX = new RegExp(
	`[${INVISIBLE_CHARS.map(([ch]) => ch).join("")}]`,
	"g",
);

export async function checkContentForbidden(
	rules: ContentForbiddenRule[],
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

			if (rule.bom) {
				const buf = Buffer.alloc(3);
				const fd = await readFile(abs);
				buf[0] = fd[0];
				buf[1] = fd[1];
				buf[2] = fd[2];
				if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
					results.push({
						rule: "forbidden",
						path: file,
						message: rule.message ?? "BOM (Byte Order Mark) が検出されました。",
						severity: rule.severity ?? "error",
					});
				}
			}

			if (rule.pattern || rule.invisible) {
				const content = await readFile(abs, "utf-8");
				const lines = content.split("\n");

				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];
					const lineNum = i + 1;

					if (rule.pattern) {
						const re = new RegExp(rule.pattern);
						if (re.test(line)) {
							results.push({
								rule: "forbidden",
								path: `${file}:${lineNum}`,
								message: rule.message ?? `禁止パターン検出: ${rule.pattern}`,
								severity: rule.severity ?? "error",
							});
						}
					}

					if (rule.invisible) {
						const matches = line.matchAll(INVISIBLE_REGEX);
						for (const m of matches) {
							const ch = m[0];
							const info = INVISIBLE_CHARS.find(([c]) => c === ch);
							if (info) {
								const [, code, name] = info;
								const hex = code.toString(16).toUpperCase().padStart(4, "0");
								results.push({
									rule: "forbidden",
									path: `${file}:${lineNum}`,
									message:
										rule.message ??
										`不可視の Unicode 文字が検出されました: U+${hex} (${name})`,
									severity: rule.severity ?? "error",
								});
							}
						}
					}
				}
			}
		}
	}

	return results;
}
