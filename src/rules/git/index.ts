import type { Check, RuleGroupResult, RuleResult } from "../../engine/types.js";
import { checkGitBranchName } from "./branch-name.js";
import { checkGitCommitAuthor } from "./commit-author.js";
import { checkGitCommitMessage } from "./commit-message.js";
import { checkGitCommitReferences } from "./commit-references.js";
import { checkGitCommitTrailers } from "./commit-trailers.js";
import { checkGitDiffIgnored } from "./diff-ignored.js";
import { checkGitDiffSize } from "./diff-size.js";
import { resolveGitRange } from "./range.js";
import { validateGitConfig } from "./schema.js";
import { checkGitTagName } from "./tag-name.js";
import type { GitConfig } from "./types.js";

const RULE_NAMES = [
	"commit.message",
	"commit.trailers",
	"commit.references",
	"commit.author",
	"diff.size",
	"diff.ignored",
	"branch_name",
	"tag_name",
];

export const gitCheck: Check = {
	category: "git",
	description:
		"Git チェック: コミットメッセージ・trailer・Issue 参照・変更粒度・ignore すり抜けを検証",
	ruleNames: RULE_NAMES,
	validate: validateGitConfig,
	run: async (config, cwd, opts) => {
		if (!config.git) return null;
		const range = resolveGitRange(cwd, { diff: opts.diff });
		const names = opts.ruleFilter ? [opts.ruleFilter] : RULE_NAMES;
		const results: RuleGroupResult[] = [];
		for (const name of names) {
			if (!RULE_NAMES.includes(name)) {
				throw new Error(`Unknown git rule: ${name}`);
			}
			const ruleResults = runSingleRule(name, config.git, cwd, range);
			results.push({ name, results: ruleResults });
		}
		return results;
	},
};

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
		case "commit.author":
			if (!range) return [];
			return checkGitCommitAuthor(
				config.commit?.author,
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
		case "branch_name":
			return checkGitBranchName(config.branch_name, cwd);
		case "tag_name":
			return checkGitTagName(config.tag_name, cwd);
		default:
			return [];
	}
}
