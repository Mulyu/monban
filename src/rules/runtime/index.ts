import type { RuleResult, RuntimeConfig } from "../../types.js";
import { checkRuntimeConsistency } from "./consistency.js";

export interface RuntimeRuleResult {
	name: string;
	results: RuleResult[];
}

const RULE_RUNNERS: Record<
	string,
	(
		config: RuntimeConfig,
		cwd: string,
		globalExclude: string[],
	) => Promise<RuleResult[]>
> = {
	consistency: (c, cwd, ex) =>
		checkRuntimeConsistency(c.consistency ?? [], cwd, ex),
};

export const RUNTIME_RULE_NAMES = Object.keys(RULE_RUNNERS);

export async function runRuntimeRules(
	config: RuntimeConfig,
	cwd: string,
	globalExclude: string[],
	ruleFilter?: string,
): Promise<RuntimeRuleResult[]> {
	const names = ruleFilter ? [ruleFilter] : RUNTIME_RULE_NAMES;
	const results: RuntimeRuleResult[] = [];

	for (const name of names) {
		const runner = RULE_RUNNERS[name];
		if (!runner) {
			throw new Error(`Unknown runtime rule: ${name}`);
		}
		const ruleResults = await runner(config, cwd, globalExclude);
		results.push({ name, results: ruleResults });
	}

	return results;
}
