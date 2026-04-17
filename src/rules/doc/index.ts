import type { DocConfig, RuleResult } from "../../types.js";
import { checkDocLink } from "./link.js";
import { checkDocRef } from "./ref.js";

export interface DocRuleResult {
	name: string;
	results: RuleResult[];
}

const RULE_RUNNERS: Record<
	string,
	(
		config: DocConfig,
		cwd: string,
		globalExclude: string[],
	) => Promise<RuleResult[]>
> = {
	ref: (c, cwd, ex) => checkDocRef(c.ref ?? [], cwd, ex),
	link: (c, cwd, ex) => checkDocLink(c.link ?? [], cwd, ex),
};

export const DOC_RULE_NAMES = Object.keys(RULE_RUNNERS);

export async function runDocRules(
	config: DocConfig,
	cwd: string,
	globalExclude: string[],
	ruleFilter?: string,
): Promise<DocRuleResult[]> {
	const names = ruleFilter ? [ruleFilter] : DOC_RULE_NAMES;
	const results: DocRuleResult[] = [];

	for (const name of names) {
		const runner = RULE_RUNNERS[name];
		if (!runner) {
			throw new Error(`Unknown doc rule: ${name}`);
		}
		const ruleResults = await runner(config, cwd, globalExclude);
		results.push({ name, results: ruleResults });
	}

	return results;
}
