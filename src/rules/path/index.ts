import type { PathConfig, RuleResult } from "../../types.js";
import { checkCount } from "./count.js";
import { checkDepth } from "./depth.js";
import { checkForbidden } from "./forbidden.js";
import { checkNaming } from "./naming.js";
import { checkRequired } from "./required.js";

export interface PathRuleResult {
	name: string;
	results: RuleResult[];
}

const RULE_RUNNERS: Record<
	string,
	(config: PathConfig, cwd: string) => Promise<RuleResult[]>
> = {
	forbidden: (c, cwd) => checkForbidden(c.forbidden ?? [], cwd),
	required: (c, cwd) => checkRequired(c.required ?? [], cwd),
	naming: (c, cwd) => checkNaming(c.naming ?? [], cwd),
	depth: (c, cwd) => checkDepth(c.depth ?? [], cwd),
	count: (c, cwd) => checkCount(c.count ?? [], cwd),
};

export const RULE_NAMES = Object.keys(RULE_RUNNERS);

export async function runPathRules(
	config: PathConfig,
	cwd: string,
	ruleFilter?: string,
): Promise<PathRuleResult[]> {
	const names = ruleFilter ? [ruleFilter] : RULE_NAMES;
	const results: PathRuleResult[] = [];

	for (const name of names) {
		const runner = RULE_RUNNERS[name];
		if (!runner) {
			throw new Error(`Unknown path rule: ${name}`);
		}
		const ruleResults = await runner(config, cwd);
		results.push({ name, results: ruleResults });
	}

	return results;
}
