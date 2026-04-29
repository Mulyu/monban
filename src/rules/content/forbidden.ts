import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import { BIDI_REGEX, lookupBidi } from "../../ports/detectors/bidi.js";
import { CONFLICT_MARKERS } from "../../ports/detectors/conflict.js";
import {
	INJECTION_PHRASES,
	TAG_BLOCK_REGEX,
} from "../../ports/detectors/injection.js";
import {
	INVISIBLE_REGEX,
	lookupInvisible,
} from "../../ports/detectors/invisible.js";
import { SECRET_DETECTORS } from "../../ports/detectors/secret.js";
import { resolveJsonKey } from "../../ports/json-key-resolver.js";
import { parseJson } from "../../ports/parse-json.js";
import type { ContentForbiddenRule, RuleResult } from "../../types.js";

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

			if (rule.json_key) {
				const raw = await readFile(abs, "utf-8");
				const parsed = parseJson(raw);
				if (!parsed.ok) {
					results.push({
						rule: "forbidden",
						path: file,
						message: rule.message ?? `${file}: JSON パースに失敗しました。`,
						severity: rule.severity ?? "error",
					});
					continue;
				}
				const re = rule.pattern ? new RegExp(rule.pattern) : null;
				for (const { key, value } of resolveJsonKey(
					parsed.value,
					rule.json_key,
				)) {
					if (re === null) {
						results.push({
							rule: "forbidden",
							path: `${file}:${key}`,
							message: rule.message ?? `禁止キー検出: ${key}`,
							severity: rule.severity ?? "error",
						});
						continue;
					}
					if (typeof value !== "string") continue;
					if (re.test(value)) {
						results.push({
							rule: "forbidden",
							path: `${file}:${key}`,
							message:
								rule.message ??
								`禁止パターン検出: ${rule.pattern} (${key} = ${truncate(value)})`,
							severity: rule.severity ?? "error",
						});
					}
				}
				continue;
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
						for (const m of line.matchAll(INVISIBLE_REGEX)) {
							const info = lookupInvisible(m[0]);
							if (info) {
								const hex = info.codePoint
									.toString(16)
									.toUpperCase()
									.padStart(4, "0");
								results.push({
									rule: "forbidden",
									path: `${file}:${lineNum}`,
									message:
										rule.message ??
										`不可視の Unicode 文字が検出されました: U+${hex} (${info.name})`,
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
							const info = lookupBidi(code);
							const name = info?.name ?? "Bidi Control";
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
						for (const marker of CONFLICT_MARKERS) {
							if (marker.pattern.test(line)) {
								results.push({
									rule: "forbidden",
									path: `${file}:${lineNum}`,
									message:
										rule.message ??
										`マージコンフリクトマーカー検出: ${marker.label}`,
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

function truncate(value: string): string {
	return value.length > 60 ? `${value.slice(0, 57)}...` : value;
}
