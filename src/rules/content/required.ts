import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fg from "../../ports/glob.js";
import type { ContentRequiredRule, RuleResult } from "../../types.js";

export async function checkContentRequired(
	rules: ContentRequiredRule[],
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

		const scope = rule.scope ?? "file";
		const re = new RegExp(rule.pattern);

		for (const file of files) {
			const abs = join(cwd, file);
			const content = await readFile(abs, "utf-8");
			const lines = content.split("\n");

			let matched = false;

			if (scope === "first_line") {
				matched = lines.length > 0 && re.test(lines[0]);
			} else if (scope === "last_line") {
				const lastNonEmpty = findLastNonEmptyLine(lines);
				matched = lastNonEmpty !== undefined && re.test(lastNonEmpty);
			} else if (rule.within_lines !== undefined) {
				const window = lines.slice(0, rule.within_lines);
				matched = window.some((line) => re.test(line));
			} else {
				matched = lines.some((line) => re.test(line));
			}

			if (!matched) {
				const scopeLabel =
					scope !== "file"
						? ` (${scope})`
						: rule.within_lines !== undefined
							? ` (within first ${rule.within_lines} lines)`
							: "";
				results.push({
					rule: "required",
					path: file,
					message:
						rule.message ??
						`必須パターンが見つかりません: ${rule.pattern}${scopeLabel}`,
					severity: "error",
				});
			}
		}
	}

	return results;
}

function findLastNonEmptyLine(lines: string[]): string | undefined {
	for (let i = lines.length - 1; i >= 0; i--) {
		if (lines[i].trim() !== "") {
			return lines[i];
		}
	}
	return undefined;
}
