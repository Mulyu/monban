import type { GitBranchNameRule, RuleResult, Severity } from "../../types.js";
import { tryRunGit } from "./git-exec.js";

export function checkGitBranchName(
	rule: GitBranchNameRule | undefined,
	cwd: string,
): RuleResult[] {
	if (!rule) return [];

	const branch = currentBranch(cwd);
	if (branch === null) return [];

	const allowed = new Set(rule.allowed ?? []);
	if (allowed.has(branch)) return [];

	const severity: Severity = rule.severity ?? "error";

	if (rule.forbidden) {
		for (const raw of rule.forbidden) {
			const re = new RegExp(raw);
			if (re.test(branch)) {
				return [
					{
						rule: "branch_name",
						path: branch,
						message:
							rule.message ??
							`branch "${branch}" matches forbidden pattern ${raw}`,
						severity,
					},
				];
			}
		}
	}

	if (rule.pattern) {
		const re = new RegExp(rule.pattern);
		if (!re.test(branch)) {
			return [
				{
					rule: "branch_name",
					path: branch,
					message:
						rule.message ??
						`branch "${branch}" does not match pattern ${rule.pattern}`,
					severity,
				},
			];
		}
	}

	return [];
}

function currentBranch(cwd: string): string | null {
	const out = tryRunGit(cwd, ["symbolic-ref", "--short", "HEAD"]);
	if (out === null) return null; // detached HEAD or no commits yet
	const name = out.trim();
	return name.length > 0 ? name : null;
}
