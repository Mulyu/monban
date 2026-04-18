import type {
	GitCommitTrailersRule,
	GitTrailerDenyEntry,
	GitTrailerRequireEntry,
	RuleResult,
	Severity,
} from "../../types.js";
import { type GitTrailer, getCommits } from "./commits.js";

export function checkGitCommitTrailers(
	rule: GitCommitTrailersRule | undefined,
	cwd: string,
	range: string,
): RuleResult[] {
	if (!rule) return [];

	const commits = getCommits(cwd, range);
	const severity: Severity = rule.severity ?? "error";
	const deny = rule.deny ?? [];
	const require = rule.require ?? [];
	const allow = new Set((rule.allow ?? []).map((a) => a.key.toLowerCase()));

	const results: RuleResult[] = [];

	for (const commit of commits) {
		if (commit.isMerge) continue;

		for (const entry of deny) {
			const match = findTrailerMatch(commit.trailers, entry);
			if (match && !allow.has(match.key.toLowerCase())) {
				const label = `${match.key}: ${match.value}`;
				const suffix = entry.message ? ` ${entry.message}` : "";
				results.push({
					rule: "commit.trailers",
					path: commit.shortSha,
					message: `trailer "${label}" is denied by policy.${suffix}`,
					severity,
				});
			}
		}

		for (const entry of require) {
			if (!hasTrailer(commit.trailers, entry)) {
				const suffix = entry.message ? ` ${entry.message}` : "";
				results.push({
					rule: "commit.trailers",
					path: commit.shortSha,
					message: `required trailer "${entry.key}" missing.${suffix}`,
					severity,
				});
			}
		}
	}

	return results;
}

function findTrailerMatch(
	trailers: GitTrailer[],
	entry: GitTrailerDenyEntry,
): GitTrailer | null {
	const keyLower = entry.key.toLowerCase();
	const valuePattern = entry.value_pattern
		? new RegExp(entry.value_pattern)
		: null;
	for (const trailer of trailers) {
		if (trailer.key.toLowerCase() !== keyLower) continue;
		if (valuePattern && !valuePattern.test(trailer.value)) continue;
		return trailer;
	}
	return null;
}

function hasTrailer(
	trailers: GitTrailer[],
	entry: GitTrailerRequireEntry,
): boolean {
	const keyLower = entry.key.toLowerCase();
	return trailers.some((t) => t.key.toLowerCase() === keyLower);
}
