import type { ContentConfig, RuleResult } from "../../types.js";
import { checkContentForbidden } from "./forbidden.js";
import { checkContentRequired } from "./required.js";
import { checkContentSize } from "./size.js";

export interface ContentRuleResult {
	name: string;
	results: RuleResult[];
}

const RULE_RUNNERS: Record<
	string,
	(
		config: ContentConfig,
		cwd: string,
		globalExclude: string[],
	) => Promise<RuleResult[]>
> = {
	forbidden: (c, cwd, ex) => checkContentForbidden(c.forbidden ?? [], cwd, ex),
	required: (c, cwd, ex) => checkContentRequired(c.required ?? [], cwd, ex),
	size: (c, cwd, ex) => checkContentSize(c.size ?? [], cwd, ex),
};

export const CONTENT_RULE_NAMES = Object.keys(RULE_RUNNERS);

export async function runContentRules(
	config: ContentConfig,
	cwd: string,
	globalExclude: string[],
	ruleFilter?: string,
): Promise<ContentRuleResult[]> {
	const names = ruleFilter ? [ruleFilter] : CONTENT_RULE_NAMES;
	const results: ContentRuleResult[] = [];

	for (const name of names) {
		const runner = RULE_RUNNERS[name];
		if (!runner) {
			throw new Error(`Unknown content rule: ${name}`);
		}
		const ruleResults = await runner(config, cwd, globalExclude);
		results.push({ name, results: ruleResults });
	}

	return results;
}
