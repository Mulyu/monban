import type { PathConfig, RuleResult } from "../../types.js";
import { checkPathCount } from "./count.js";
import { checkPathDepth } from "./depth.js";
import { checkPathForbidden } from "./forbidden.js";
import { checkPathNaming } from "./naming.js";
import { checkPathRequired } from "./required.js";

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
	forbidden: (c, cwd, ex) => checkPathForbidden(c.forbidden ?? [], cwd, ex),
	required: (c, cwd, ex) => checkPathRequired(c.required ?? [], cwd, ex),
	naming: (c, cwd, ex) => checkPathNaming(c.naming ?? [], cwd, ex),
	depth: (c, cwd, ex) => checkPathDepth(c.depth ?? [], cwd, ex),
	count: (c, cwd, ex) => checkPathCount(c.count ?? [], cwd, ex),
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
