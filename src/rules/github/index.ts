import type { Check, RuleGroupResult, RuleResult } from "../../engine/types.js";
import { checkGithubCodeowners } from "./codeowners.js";
import { checkGithubConcurrency } from "./concurrency.js";
import { checkGithubConsistency } from "./consistency.js";
import { checkGithubActionsDanger } from "./danger.js";
import { checkGithubForbidden } from "./forbidden.js";
import { checkGithubActionsInjection } from "./injection.js";
import { checkGithubPermissions } from "./permissions.js";
import { checkGithubPinned } from "./pinned.js";
import { checkGithubRequired } from "./required.js";
import { checkGithubRunner } from "./runner.js";
import { validateGithubConfig } from "./schema/index.js";
import { checkGithubSecrets } from "./secrets.js";
import { checkGithubTimeout } from "./timeout.js";
import { checkGithubTriggers } from "./triggers.js";
import type { GithubConfig } from "./types.js";

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
	"actions.danger": (c, cwd, ex) =>
		checkGithubActionsDanger(c.actions?.danger ?? [], cwd, ex),
	"actions.injection": (c, cwd, ex) =>
		checkGithubActionsInjection(c.actions?.injection ?? [], cwd, ex),
	"codeowners.ownership": (c, cwd, ex) =>
		checkGithubCodeowners(c.codeowners?.ownership ?? [], cwd, ex),
};

const RULE_NAMES = Object.keys(RULE_RUNNERS);

export const githubCheck: Check = {
	category: "github",
	description: "GitHub チェック: workflows と CODEOWNERS の構造を検証",
	ruleNames: RULE_NAMES,
	validate: validateGithubConfig,
	run: async (config, cwd, opts) => {
		if (!config.github) return null;
		const names = opts.ruleFilter ? [opts.ruleFilter] : RULE_NAMES;
		const results: RuleGroupResult[] = [];
		for (const name of names) {
			const runner = RULE_RUNNERS[name];
			if (!runner) {
				throw new Error(`Unknown github rule: ${name}`);
			}
			const ruleResults = await runner(config.github, cwd, opts.globalExclude);
			results.push({ name, results: ruleResults });
		}
		return results;
	},
};
