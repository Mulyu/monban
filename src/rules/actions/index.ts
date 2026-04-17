import type { ActionsConfig, RuleResult } from "../../types.js";
import { checkActionsForbidden } from "./forbidden.js";
import { checkActionsPinned } from "./pinned.js";
import { checkActionsRequired } from "./required.js";

export interface ActionsRuleResult {
	name: string;
	results: RuleResult[];
}

const RULE_RUNNERS: Record<
	string,
	(
		config: ActionsConfig,
		cwd: string,
		globalExclude: string[],
	) => Promise<RuleResult[]>
> = {
	pinned: (c, cwd, ex) => checkActionsPinned(c.pinned ?? [], cwd, ex),
	required: (c, cwd) => checkActionsRequired(c.required ?? [], cwd),
	forbidden: (c, cwd, ex) => checkActionsForbidden(c.forbidden ?? [], cwd, ex),
};

export const ACTIONS_RULE_NAMES = Object.keys(RULE_RUNNERS);

export async function runActionsRules(
	config: ActionsConfig,
	cwd: string,
	globalExclude: string[],
	ruleFilter?: string,
): Promise<ActionsRuleResult[]> {
	const names = ruleFilter ? [ruleFilter] : ACTIONS_RULE_NAMES;
	const results: ActionsRuleResult[] = [];

	for (const name of names) {
		const runner = RULE_RUNNERS[name];
		if (!runner) {
			throw new Error(`Unknown actions rule: ${name}`);
		}
		const ruleResults = await runner(config, cwd, globalExclude);
		results.push({ name, results: ruleResults });
	}

	return results;
}
