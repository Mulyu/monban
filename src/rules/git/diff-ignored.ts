import picomatch from "picomatch";
import type { GitDiffIgnoredRule, RuleResult, Severity } from "../../types.js";
import { tryRunGit } from "./git-exec.js";

export function checkGitDiffIgnored(
	rule: GitDiffIgnoredRule | undefined,
	cwd: string,
	diffRange: string | null,
): RuleResult[] {
	if (!rule) return [];

	const scope = rule.scope ?? "diff";
	const severity: Severity = rule.severity ?? "warn";
	const allowMatchers = (rule.allow ?? []).map((p) => picomatch(p));

	const ignoredTracked = getIgnoredTracked(cwd);
	if (ignoredTracked.length === 0) return [];

	let targets = ignoredTracked;
	if (scope === "diff") {
		if (!diffRange) return [];
		const added = new Set(getAddedFiles(cwd, diffRange));
		targets = ignoredTracked.filter((f) => added.has(f));
	}

	const defaultMsg = rule.message ?? "matches .gitignore but is tracked.";

	return targets
		.filter((f) => !allowMatchers.some((m) => m(f)))
		.map(
			(file): RuleResult => ({
				rule: "diff.ignored",
				path: file,
				message: defaultMsg,
				severity,
			}),
		);
}

function getIgnoredTracked(cwd: string): string[] {
	const out = tryRunGit(cwd, [
		"ls-files",
		"--cached",
		"--ignored",
		"--exclude-standard",
	]);
	if (out === null) return [];
	return out.split("\n").filter(Boolean);
}

function getAddedFiles(cwd: string, diffRange: string): string[] {
	const out = tryRunGit(cwd, [
		"diff",
		"--name-only",
		"--diff-filter=A",
		diffRange,
	]);
	if (out === null) return [];
	return out.split("\n").filter(Boolean);
}
