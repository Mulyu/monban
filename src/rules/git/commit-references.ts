import type {
	GitCommitReferencesRule,
	RuleResult,
	Severity,
} from "../../types.js";
import { type GitCommit, getCommits } from "./commits.js";

export function checkGitCommitReferences(
	rule: GitCommitReferencesRule | undefined,
	cwd: string,
	range: string,
): RuleResult[] {
	if (!rule || rule.required !== true) return [];

	const patterns = (rule.patterns ?? []).map((p) => new RegExp(p));
	if (patterns.length === 0) return [];

	const severity: Severity = rule.severity ?? "error";
	const scope = rule.scope ?? "any";
	const ignoreMerges = rule.ignore_merges ?? true;
	const ignorePatterns = (rule.ignore_patterns ?? []).map((p) => new RegExp(p));

	const commits = getCommits(cwd, range).filter(
		(c) => !shouldIgnore(c, ignoreMerges, ignorePatterns),
	);

	if (commits.length === 0) return [];

	const hasReference = (c: GitCommit): boolean => {
		const text = `${c.subject}\n${c.body}`;
		return patterns.some((p) => p.test(text));
	};

	if (scope === "any") {
		if (commits.some(hasReference)) return [];
		const patternList = (rule.patterns ?? []).join(", ");
		return [
			{
				rule: "commit.references",
				path: "",
				message: `no commit in range contains a reference matching [${patternList}]`,
				severity,
			},
		];
	}

	return commits
		.filter((c) => !hasReference(c))
		.map(
			(c): RuleResult => ({
				rule: "commit.references",
				path: c.shortSha,
				message: `commit does not contain a reference matching [${(rule.patterns ?? []).join(", ")}]`,
				severity,
			}),
		);
}

function shouldIgnore(
	commit: GitCommit,
	ignoreMerges: boolean,
	ignorePatterns: RegExp[],
): boolean {
	if (ignoreMerges && commit.isMerge) return true;
	return ignorePatterns.some((p) => p.test(commit.subject));
}
