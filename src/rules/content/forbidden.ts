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

const BIDI_CONTROLS: [number, string][] = [
	[0x202a, "Left-to-Right Embedding"],
	[0x202b, "Right-to-Left Embedding"],
	[0x202c, "Pop Directional Formatting"],
	[0x202d, "Left-to-Right Override"],
	[0x202e, "Right-to-Left Override"],
	[0x2066, "Left-to-Right Isolate"],
	[0x2067, "Right-to-Left Isolate"],
	[0x2068, "First Strong Isolate"],
	[0x2069, "Pop Directional Isolate"],
];

const BIDI_REGEX = new RegExp(
	`[${BIDI_CONTROLS.map(([c]) => `\\u${c.toString(16).padStart(4, "0")}`).join("")}]`,
	"g",
);

const TAG_BLOCK_REGEX = /[\u{E0000}-\u{E007F}]/gu;

const INJECTION_PHRASES: RegExp[] = [
	/\bignore\s+(?:all\s+)?(?:previous|prior|above|preceding)\s+instructions?\b/i,
	/\bdisregard\s+(?:all\s+)?(?:previous|prior|above|the\s+system)\s+(?:instructions?|prompt|rules?)\b/i,
	/\byou\s+are\s+now\s+(?:a\s+|an\s+)?[a-z]/i,
	/\bforget\s+(?:everything|all)\s+(?:you\s+)?(?:know|were\s+told)\b/i,
	/\b(?:new|updated)\s+(?:system\s+)?(?:prompt|instructions?)[:\s]/i,
];

const CONFLICT_MARKERS: [RegExp, string][] = [
	[/^<{7}(?:\s|$)/, "start marker (<<<<<<<)"],
	[/^={7}$/, "separator (=======)"],
	[/^>{7}(?:\s|$)/, "end marker (>>>>>>>)"],
];

const SECRET_DETECTORS: { name: string; pattern: RegExp }[] = [
	{ name: "AWS Access Key ID", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
	{ name: "GitHub Personal Access Token", pattern: /\bghp_[0-9A-Za-z]{36}\b/ },
	{ name: "GitHub OAuth Token", pattern: /\bgho_[0-9A-Za-z]{36}\b/ },
	{ name: "GitHub App Token", pattern: /\b(?:ghu|ghs)_[0-9A-Za-z]{36}\b/ },
	{ name: "GitHub Refresh Token", pattern: /\bghr_[0-9A-Za-z]{36}\b/ },
	{ name: "Google API Key", pattern: /\bAIza[0-9A-Za-z\-_]{35}\b/ },
	{ name: "Slack Token", pattern: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/ },
	{
		name: "Stripe Live Key",
		pattern: /\b(?:sk|pk|rk)_live_[0-9A-Za-z]{24,}\b/,
	},
	{ name: "NPM Token", pattern: /\bnpm_[0-9A-Za-z]{36}\b/ },
	{
		name: "JWT",
		pattern: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_\-+/=]{10,}\b/,
	},
	{
		name: "Private Key Block",
		pattern: /-----BEGIN (?:RSA|OPENSSH|DSA|EC|PGP) PRIVATE KEY-----/,
	},
];

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
			ignore: [...globalExclude, ...(rule.exclude ?? [])],
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

			if (
				rule.pattern ||
				rule.invisible ||
				rule.secret ||
				rule.injection ||
				rule.conflict
			) {
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

					if (rule.secret) {
						for (const detector of SECRET_DETECTORS) {
							if (detector.pattern.test(line)) {
								results.push({
									rule: "forbidden",
									path: `${file}:${lineNum}`,
									message: rule.message ?? `シークレット検出: ${detector.name}`,
									severity: rule.severity ?? "error",
								});
							}
						}
					}

					if (rule.injection) {
						for (const m of line.matchAll(TAG_BLOCK_REGEX)) {
							const code = m[0].codePointAt(0) ?? 0;
							const hex = code.toString(16).toUpperCase().padStart(4, "0");
							results.push({
								rule: "forbidden",
								path: `${file}:${lineNum}`,
								message:
									rule.message ??
									`プロンプトインジェクション疑い: Unicode Tag 文字 U+${hex}`,
								severity: rule.severity ?? "error",
							});
						}
						for (const m of line.matchAll(BIDI_REGEX)) {
							const code = m[0].codePointAt(0) ?? 0;
							const info = BIDI_CONTROLS.find(([c]) => c === code);
							const name = info?.[1] ?? "Bidi Control";
							const hex = code.toString(16).toUpperCase().padStart(4, "0");
							results.push({
								rule: "forbidden",
								path: `${file}:${lineNum}`,
								message:
									rule.message ??
									`プロンプトインジェクション疑い: 双方向制御文字 U+${hex} (${name})`,
								severity: rule.severity ?? "error",
							});
						}
						for (const phrase of INJECTION_PHRASES) {
							if (phrase.test(line)) {
								results.push({
									rule: "forbidden",
									path: `${file}:${lineNum}`,
									message:
										rule.message ??
										`プロンプトインジェクション疑い: 指示上書きフレーズを検出`,
									severity: rule.severity ?? "error",
								});
								break;
							}
						}
					}

					if (rule.conflict) {
						for (const [marker, label_] of CONFLICT_MARKERS) {
							if (marker.test(line)) {
								results.push({
									rule: "forbidden",
									path: `${file}:${lineNum}`,
									message:
										rule.message ?? `マージコンフリクトマーカー検出: ${label_}`,
									severity: rule.severity ?? "error",
								});
								break;
							}
						}
					}
				}
			}
		}
	}

	return results;
}
