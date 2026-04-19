import { lstat } from "node:fs/promises";
import { join } from "node:path";
import fg from "../../glob.js";
import type { ForbiddenRule, RuleResult } from "../../types.js";

export async function checkPathForbidden(
	rules: ForbiddenRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const matches = await fg(rule.path, {
			cwd,
			dot: false,
			onlyFiles: false,
			markDirectories: true,
			followSymbolicLinks: false,
			ignore: globalExclude,
		});

		for (const match of matches) {
			if (rule.type !== undefined) {
				const matched = await matchesType(cwd, match, rule.type);
				if (!matched) continue;
			}
			results.push({
				rule: "forbidden",
				path: match,
				message: rule.message ?? `禁止パターンに一致しました: ${rule.path}`,
				severity: rule.severity ?? "error",
			});
		}
	}

	return results;
}

async function matchesType(
	cwd: string,
	relPath: string,
	want: "file" | "directory" | "symlink",
): Promise<boolean> {
	// fast-glob's markDirectories appends `/` to directory matches.
	const cleaned = relPath.replace(/\/$/, "");
	try {
		const stat = await lstat(join(cwd, cleaned));
		if (want === "symlink") return stat.isSymbolicLink();
		if (want === "directory") return stat.isDirectory();
		return stat.isFile();
	} catch {
		return false;
	}
}
