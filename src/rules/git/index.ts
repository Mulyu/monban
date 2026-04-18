import type { GitConfig, RuleResult } from "../../types.js";
import { checkGitCommitMessage } from "./commit-message.js";
import { checkGitCommitReferences } from "./commit-references.js";
import { checkGitCommitTrailers } from "./commit-trailers.js";
import { checkGitDiffIgnored } from "./diff-ignored.js";
import { checkGitDiffSize } from "./diff-size.js";
import { resolveGitRange } from "./range.js";

export interface GitRuleResult {
	name: string;
	results: RuleResult[];
}

export interface GitRuleOpts {
	diff?: string | boolean;
}

export const GIT_RULE_NAMES = [
	"commit.message",
	"commit.trailers",
	"commit.references",
	"diff.size",
	"diff.ignored",
];

export async function runGitRules(
	config: GitConfig,
	cwd: string,
	ruleFilter: string | undefined,
	opts: GitRuleOpts,
): Promise<GitRuleResult[]> {
	const range = resolveGitRange(cwd, { diff: opts.diff });
	const names = ruleFilter ? [ruleFilter] : GIT_RULE_NAMES;
	const results: GitRuleResult[] = [];

	for (const name of names) {
		if (!GIT_RULE_NAMES.includes(name)) {
			throw new Error(`Unknown git rule: ${name}`);
		}
		const ruleResults = runSingleRule(name, config, cwd, range);
		results.push({ name, results: ruleResults });
	}

	return results;
}

function runSingleRule(
	name: string,
	config: GitConfig,
	cwd: string,
	range: ReturnType<typeof resolveGitRange>,
): RuleResult[] {
	switch (name) {
		case "commit.message":
			if (!range) return [];
			return checkGitCommitMessage(
				config.commit?.message,
				cwd,
				range.commitRange,
			);
		case "commit.trailers":
			if (!range) return [];
			return checkGitCommitTrailers(
				config.commit?.trailers,
				cwd,
				range.commitRange,
			);
		case "commit.references":
			if (!range) return [];
			return checkGitCommitReferences(
				config.commit?.references,
				cwd,
				range.commitRange,
			);
		case "diff.size":
			if (!range) return [];
			return checkGitDiffSize(config.diff?.size, cwd, range.diffRange);
		case "diff.ignored":
			return checkGitDiffIgnored(
				config.diff?.ignored,
				cwd,
				range?.diffRange ?? null,
			);
		default:
			return [];
	}
}
