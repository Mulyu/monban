import type { GithubConfig, RuleResult } from "../../types.js";
import { checkGithubCodeowners } from "./codeowners.js";
import { checkGithubConcurrency } from "./concurrency.js";
import { checkGithubConsistency } from "./consistency.js";
import { checkGithubForbidden } from "./forbidden.js";
import { checkGithubPermissions } from "./permissions.js";
import { checkGithubPinned } from "./pinned.js";
import { checkGithubRequired } from "./required.js";
import { checkGithubRunner } from "./runner.js";
import { checkGithubSecrets } from "./secrets.js";
import { checkGithubTimeout } from "./timeout.js";
import { checkGithubTriggers } from "./triggers.js";

export interface GithubRuleResult {
	name: string;
	results: RuleResult[];
}

const RULE_RUNNERS: Record<
	string,
	(
		config: GithubConfig,
		cwd: string,
		globalExclude: string[],
	) => Promise<RuleResult[]>
> = {
	pinned: (c, cwd, ex) => checkGithubPinned(c.pinned ?? [], cwd, ex),
	required: (c, cwd) => checkGithubRequired(c.required ?? [], cwd),
	forbidden: (c, cwd, ex) => checkGithubForbidden(c.forbidden ?? [], cwd, ex),
	permissions: (c, cwd, ex) =>
		checkGithubPermissions(c.permissions ?? [], cwd, ex),
	triggers: (c, cwd, ex) => checkGithubTriggers(c.triggers ?? [], cwd, ex),
	runner: (c, cwd, ex) => checkGithubRunner(c.runner ?? [], cwd, ex),
	timeout: (c, cwd, ex) => checkGithubTimeout(c.timeout ?? [], cwd, ex),
	concurrency: (c, cwd, ex) =>
		checkGithubConcurrency(c.concurrency ?? [], cwd, ex),
	consistency: (c, cwd, ex) =>
		checkGithubConsistency(c.consistency ?? [], cwd, ex),
	secrets: (c, cwd, ex) => checkGithubSecrets(c.secrets ?? [], cwd, ex),
	codeowners: (c, cwd, ex) =>
		checkGithubCodeowners(c.codeowners ?? [], cwd, ex),
};

export const GITHUB_RULE_NAMES = Object.keys(RULE_RUNNERS);

export async function runGithubRules(
	config: GithubConfig,
	cwd: string,
	globalExclude: string[],
	ruleFilter?: string,
): Promise<GithubRuleResult[]> {
	const names = ruleFilter ? [ruleFilter] : GITHUB_RULE_NAMES;
	const results: GithubRuleResult[] = [];

	for (const name of names) {
		const runner = RULE_RUNNERS[name];
		if (!runner) {
			throw new Error(`Unknown github rule: ${name}`);
		}
		const ruleResults = await runner(config, cwd, globalExclude);
		results.push({ name, results: ruleResults });
	}

	return results;
}
