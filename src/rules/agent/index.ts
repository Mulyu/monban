import type { AgentConfig, RuleResult } from "../../types.js";
import { checkAgentIgnore } from "./ignore.js";
import { checkAgentInstructions } from "./instructions.js";
import { checkAgentMcp } from "./mcp.js";

export interface AgentRuleResult {
	name: string;
	results: RuleResult[];
}

const RULE_RUNNERS: Record<
	string,
	(
		config: AgentConfig,
		cwd: string,
		globalExclude: string[],
	) => Promise<RuleResult[]>
> = {
	instructions: (c, cwd, ex) =>
		checkAgentInstructions(c.instructions ?? [], cwd, ex),
	mcp: (c, cwd, ex) => checkAgentMcp(c.mcp ?? [], cwd, ex),
	ignore: (c, cwd, ex) => checkAgentIgnore(c.ignore ?? [], cwd, ex),
};

export const AGENT_RULE_NAMES = Object.keys(RULE_RUNNERS);

export async function runAgentRules(
	config: AgentConfig,
	cwd: string,
	globalExclude: string[],
	ruleFilter?: string,
): Promise<AgentRuleResult[]> {
	const names = ruleFilter ? [ruleFilter] : AGENT_RULE_NAMES;
	const results: AgentRuleResult[] = [];

	for (const name of names) {
		const runner = RULE_RUNNERS[name];
		if (!runner) {
			throw new Error(`Unknown agent rule: ${name}`);
		}
		const ruleResults = await runner(config, cwd, globalExclude);
		results.push({ name, results: ruleResults });
	}

	return results;
}
