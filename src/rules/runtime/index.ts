import type { Check, RuleGroupResult, RuleResult } from "../../engine/types.js";
import { checkRuntimeConsistency } from "./consistency.js";
import { validateRuntimeConfig } from "./schema.js";
import type { RuntimeConfig } from "./types.js";

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

const RULE_NAMES = Object.keys(RULE_RUNNERS);

export const runtimeCheck: Check = {
	category: "runtime",
	description:
		"ランタイムチェック: 複数ファイルに散らばるランタイムバージョン指定の整合を検証",
	ruleNames: RULE_NAMES,
	validate: validateRuntimeConfig,
	run: async (config, cwd, opts) => {
		if (!config.runtime) return null;
		const names = opts.ruleFilter ? [opts.ruleFilter] : RULE_NAMES;
		const results: RuleGroupResult[] = [];
		for (const name of names) {
			const runner = RULE_RUNNERS[name];
			if (!runner) {
				throw new Error(`Unknown runtime rule: ${name}`);
			}
			const ruleResults = await runner(config.runtime, cwd, opts.globalExclude);
			results.push({ name, results: ruleResults });
		}
		return results;
	},
};
