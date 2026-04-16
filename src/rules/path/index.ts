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
	(
		config: PathConfig,
		cwd: string,
		globalExclude: string[],
	) => Promise<RuleResult[]>
> = {
	forbidden: (c, cwd, ex) => checkForbidden(c.forbidden ?? [], cwd, ex),
	required: (c, cwd, ex) => checkRequired(c.required ?? [], cwd, ex),
	naming: (c, cwd, ex) => checkNaming(c.naming ?? [], cwd, ex),
	depth: (c, cwd, ex) => checkDepth(c.depth ?? [], cwd, ex),
	count: (c, cwd, ex) => checkCount(c.count ?? [], cwd, ex),
};

export const RULE_NAMES = Object.keys(RULE_RUNNERS);

export async function runPathRules(
	config: PathConfig,
	cwd: string,
	globalExclude: string[],
	ruleFilter?: string,
): Promise<PathRuleResult[]> {
	const names = ruleFilter ? [ruleFilter] : RULE_NAMES;
	const results: PathRuleResult[] = [];

	for (const name of names) {
		const runner = RULE_RUNNERS[name];
		if (!runner) {
			throw new Error(`Unknown path rule: ${name}`);
		}
		const ruleResults = await runner(config, cwd, globalExclude);
		results.push({ name, results: ruleResults });
	}

	return results;
}
