import type { GitTagNameRule, RuleResult, Severity } from "../../types.js";
import { tryRunGit } from "./git-exec.js";

export function checkGitTagName(
	rule: GitTagNameRule | undefined,
	cwd: string,
): RuleResult[] {
	if (!rule) return [];

	const tags = listTags(cwd, rule.scope ?? "all", rule.limit ?? 100);
	if (tags.length === 0) return [];

	const re = new RegExp(rule.pattern);
	const severity: Severity = rule.severity ?? "error";
	const results: RuleResult[] = [];

	for (const tag of tags) {
		if (re.test(tag)) continue;
		results.push({
			rule: "tag_name",
			path: tag,
			message:
				rule.message ?? `tag "${tag}" does not match pattern ${rule.pattern}`,
			severity,
		});
	}

	return results;
}

function listTags(
	cwd: string,
	scope: "all" | "recent",
	limit: number,
): string[] {
	if (scope === "recent") {
		// Most recent tags by creation date
		const out = tryRunGit(cwd, [
			"for-each-ref",
			"--sort=-creatordate",
			`--count=${limit}`,
			"--format=%(refname:short)",
			"refs/tags",
		]);
		if (!out) return [];
		return out
			.split("\n")
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
	}

	const out = tryRunGit(cwd, ["tag", "--list"]);
	if (!out) return [];
	return out
		.split("\n")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}
