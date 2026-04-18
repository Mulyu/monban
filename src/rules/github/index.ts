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
	"actions.pinned": (c, cwd, ex) =>
		checkGithubPinned(c.actions?.pinned ?? [], cwd, ex),
	"actions.required": (c, cwd) =>
		checkGithubRequired(c.actions?.required ?? [], cwd),
	"actions.forbidden": (c, cwd, ex) =>
		checkGithubForbidden(c.actions?.forbidden ?? [], cwd, ex),
	"actions.permissions": (c, cwd, ex) =>
		checkGithubPermissions(c.actions?.permissions ?? [], cwd, ex),
	"actions.triggers": (c, cwd, ex) =>
		checkGithubTriggers(c.actions?.triggers ?? [], cwd, ex),
	"actions.runner": (c, cwd, ex) =>
		checkGithubRunner(c.actions?.runner ?? [], cwd, ex),
	"actions.timeout": (c, cwd, ex) =>
		checkGithubTimeout(c.actions?.timeout ?? [], cwd, ex),
	"actions.concurrency": (c, cwd, ex) =>
		checkGithubConcurrency(c.actions?.concurrency ?? [], cwd, ex),
	"actions.consistency": (c, cwd, ex) =>
		checkGithubConsistency(c.actions?.consistency ?? [], cwd, ex),
	"actions.secrets": (c, cwd, ex) =>
		checkGithubSecrets(c.actions?.secrets ?? [], cwd, ex),
	"codeowners.ownership": (c, cwd, ex) =>
		checkGithubCodeowners(c.codeowners?.ownership ?? [], cwd, ex),
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
