import picomatch from "picomatch";
import type { GitDiffSizeRule, RuleResult, Severity } from "../../types.js";
import { tryRunGit } from "./git-exec.js";

interface FileStat {
	path: string;
	insertions: number;
	deletions: number;
	binary: boolean;
}

export function checkGitDiffSize(
	rule: GitDiffSizeRule | undefined,
	cwd: string,
	diffRange: string,
): RuleResult[] {
	if (!rule) return [];

	const stats = getNumstat(cwd, diffRange);
	const filtered = filterStats(stats, rule.exclude ?? []);
	const severity: Severity = rule.severity ?? "warn";

	const totalFiles = filtered.length;
	const totalInsertions = filtered.reduce(
		(sum, s) => sum + (s.binary ? 0 : s.insertions),
		0,
	);
	const totalDeletions = filtered.reduce(
		(sum, s) => sum + (s.binary ? 0 : s.deletions),
		0,
	);
	const totalLines = totalInsertions + totalDeletions;

	const results: RuleResult[] = [];

	if (rule.max_files !== undefined && totalFiles > rule.max_files) {
		results.push({
			rule: "diff.size",
			path: "",
			message: `total changed files ${totalFiles} exceeds max ${rule.max_files}`,
			severity,
		});
	}

	if (
		rule.max_insertions !== undefined &&
		totalInsertions > rule.max_insertions
	) {
		results.push({
			rule: "diff.size",
			path: "",
			message: `total insertions ${totalInsertions} exceeds max ${rule.max_insertions}`,
			severity,
		});
	}

	if (rule.max_deletions !== undefined && totalDeletions > rule.max_deletions) {
		results.push({
			rule: "diff.size",
			path: "",
			message: `total deletions ${totalDeletions} exceeds max ${rule.max_deletions}`,
			severity,
		});
	}

	if (rule.max_total_lines !== undefined && totalLines > rule.max_total_lines) {
		results.push({
			rule: "diff.size",
			path: "",
			message: `total lines (insertions + deletions) ${totalLines} exceeds max ${rule.max_total_lines}`,
			severity,
		});
	}

	return results;
}

function getNumstat(cwd: string, diffRange: string): FileStat[] {
	const out = tryRunGit(cwd, ["diff", "--numstat", diffRange]);
	if (out === null) return [];

	const stats: FileStat[] = [];
	for (const line of out.split("\n")) {
		if (line.length === 0) continue;
		const parts = line.split("\t");
		if (parts.length < 3) continue;
		const [ins, del, ...rest] = parts;
		const path = rest.join("\t");
		const binary = ins === "-" || del === "-";
		stats.push({
			path,
			insertions: binary ? 0 : Number.parseInt(ins, 10) || 0,
			deletions: binary ? 0 : Number.parseInt(del, 10) || 0,
			binary,
		});
	}
	return stats;
}

function filterStats(stats: FileStat[], exclude: string[]): FileStat[] {
	if (exclude.length === 0) return stats;
	const matchers = exclude.map((p) => picomatch(p));
	return stats.filter((s) => !matchers.some((m) => m(s.path)));
}
