import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import fg from "../../ports/glob.js";
import type { DocRefRule, RuleResult } from "../../types.js";

const REF_MARKER = /<!--\s*monban:ref\s+(\S+)\s+(\w+):(\w+)\s*-->/g;

export async function checkDocRef(
	rules: DocRefRule[],
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

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				const lineNum = i + 1;

				for (const match of line.matchAll(REF_MARKER)) {
					const refPath = match[1];
					const algo = match[2];
					const expectedHash = match[3];

					const refAbs = resolve(dirname(abs), refPath);
					let actualContent: Buffer;
					try {
						actualContent = await readFile(refAbs);
					} catch {
						results.push({
							rule: "ref",
							path: `${file}:${lineNum}`,
							message: `参照先ファイルが見つかりません: ${refPath}`,
							severity: "error",
						});
						continue;
					}

					const actualHash = createHash(algo)
						.update(actualContent)
						.digest("hex");

					if (actualHash !== expectedHash) {
						results.push({
							rule: "ref",
							path: `${file}:${lineNum}`,
							message: `ハッシュ不一致: ${refPath} (expected: ${expectedHash.slice(0, 12)}... actual: ${actualHash.slice(0, 12)}...)`,
							severity: "error",
						});
					}
				}
			}
		}
	}

	return results;
}
