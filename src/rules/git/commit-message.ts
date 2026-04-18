import type {
	GitCommitMessagePreset,
	GitCommitMessageRule,
	RuleResult,
	Severity,
} from "../../types.js";
import { type GitCommit, getCommits } from "./commits.js";

const PRESET_PATTERNS: Record<GitCommitMessagePreset, string> = {
	conventional:
		"^(feat|fix|chore|docs|refactor|test|perf|ci|build|style)(\\(.+\\))?!?: .+",
};

export function checkGitCommitMessage(
	rule: GitCommitMessageRule | undefined,
	cwd: string,
	range: string,
): RuleResult[] {
	if (!rule) return [];

	const commits = getCommits(cwd, range);
	const severity: Severity = rule.severity ?? "error";
	const ignoreMerges = rule.ignore_merges ?? true;
	const ignoreReverts = rule.ignore_reverts ?? true;
	const pattern = resolvePattern(rule);
	const forbidden = new Set(
		(rule.forbidden_subjects ?? []).map((s) => s.trim().toLowerCase()),
	);

	const results: RuleResult[] = [];

	for (const commit of commits) {
		if (ignoreMerges && commit.isMerge) continue;
		if (ignoreReverts && commit.isRevert) continue;

		const violations = checkOne(commit, pattern, forbidden, rule);
		for (const message of violations) {
			results.push({
				rule: "commit.message",
				path: commit.shortSha,
				message,
				severity,
			});
		}
	}

	return results;
}

function resolvePattern(rule: GitCommitMessageRule): RegExp | null {
	if (rule.preset) return new RegExp(PRESET_PATTERNS[rule.preset]);
	if (rule.pattern) return new RegExp(rule.pattern);
	return null;
}

function checkOne(
	commit: GitCommit,
	pattern: RegExp | null,
	forbidden: Set<string>,
	rule: GitCommitMessageRule,
): string[] {
	const messages: string[] = [];
	const subject = commit.subject;
	const subjectLen = [...subject].length;

	if (pattern && !pattern.test(subject)) {
		messages.push(
			`subject does not match pattern ${pattern.source}: "${subject}"`,
		);
	}

	const maxLen = rule.subject_max_length;
	if (maxLen !== undefined && subjectLen > maxLen) {
		messages.push(
			`subject exceeds ${maxLen} chars (${subjectLen}): "${subject}"`,
		);
	}

	const minLen = rule.subject_min_length;
	if (minLen !== undefined && subjectLen < minLen) {
		messages.push(
			`subject shorter than ${minLen} chars (${subjectLen}): "${subject}"`,
		);
	}

	if (forbidden.size > 0 && forbidden.has(subject.trim().toLowerCase())) {
		messages.push(`subject is a forbidden keyword: "${subject}"`);
	}

	const bodyMin = rule.body_min_length ?? 0;
	if (bodyMin > 0 && commit.body.trim().length < bodyMin) {
		messages.push(`commit body shorter than ${bodyMin} chars`);
	}

	return messages;
}
