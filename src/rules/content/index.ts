import type { Check, RuleGroupResult, RuleResult } from "../../engine/types.js";
import { checkContentForbidden } from "./forbidden.js";
import { checkContentRequired } from "./required.js";
import { validateContentConfig } from "./schema.js";
import { checkContentSize } from "./size.js";
import type { ContentConfig } from "./types.js";

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

const RULE_NAMES = Object.keys(RULE_RUNNERS);

export const contentCheck: Check = {
	category: "content",
	description:
		"コンテンツチェック: ファイル内容の禁止・必須パターン・行数を検証",
	ruleNames: RULE_NAMES,
	validate: validateContentConfig,
	run: async (config, cwd, opts) => {
		if (!config.content) return null;
		const names = opts.ruleFilter ? [opts.ruleFilter] : RULE_NAMES;
		const results: RuleGroupResult[] = [];
		for (const name of names) {
			const runner = RULE_RUNNERS[name];
			if (!runner) {
				throw new Error(`Unknown content rule: ${name}`);
			}
			const ruleResults = await runner(config.content, cwd, opts.globalExclude);
			results.push({ name, results: ruleResults });
		}
		return results;
	},
};
