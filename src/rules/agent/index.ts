import type { Check, RuleGroupResult, RuleResult } from "../../engine/types.js";
import { checkAgentIgnore } from "./ignore.js";
import { checkAgentInstructions } from "./instructions.js";
import { checkAgentMcp } from "./mcp.js";
import { validateAgentConfig } from "./schema.js";
import { checkAgentSettings } from "./settings.js";
import type { AgentConfig } from "./types.js";

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
	settings: (c, cwd, ex) => checkAgentSettings(c.settings ?? [], cwd, ex),
	ignore: (c, cwd, ex) => checkAgentIgnore(c.ignore ?? [], cwd, ex),
};

const RULE_NAMES = Object.keys(RULE_RUNNERS);

export const agentCheck: Check = {
	category: "agent",
	description:
		"エージェントチェック: AGENTS.md / .mcp.json / AI ignore ファイルの構造を検証",
	ruleNames: RULE_NAMES,
	validate: validateAgentConfig,
	run: async (config, cwd, opts) => {
		if (!config.agent) return null;
		const names = opts.ruleFilter ? [opts.ruleFilter] : RULE_NAMES;
		const results: RuleGroupResult[] = [];
		for (const name of names) {
			const runner = RULE_RUNNERS[name];
			if (!runner) {
				throw new Error(`Unknown agent rule: ${name}`);
			}
			const ruleResults = await runner(config.agent, cwd, opts.globalExclude);
			results.push({ name, results: ruleResults });
		}
		return results;
	},
};
