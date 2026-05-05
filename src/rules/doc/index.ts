import type { Check, RuleGroupResult, RuleResult } from "../../engine/types.js";
import { checkDocLink } from "./link.js";
import { checkDocRef } from "./ref.js";
import { validateDocConfig } from "./schema.js";
import type { DocConfig } from "./types.js";

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

const RULE_NAMES = Object.keys(RULE_RUNNERS);

export const docCheck: Check = {
	category: "doc",
	description: "ドキュメントチェック: 参照整合性・リンク切れを検証",
	ruleNames: RULE_NAMES,
	validate: validateDocConfig,
	run: async (config, cwd, opts) => {
		if (!config.doc) return null;
		const names = opts.ruleFilter ? [opts.ruleFilter] : RULE_NAMES;
		const results: RuleGroupResult[] = [];
		for (const name of names) {
			const runner = RULE_RUNNERS[name];
			if (!runner) {
				throw new Error(`Unknown doc rule: ${name}`);
			}
			const ruleResults = await runner(config.doc, cwd, opts.globalExclude);
			results.push({ name, results: ruleResults });
		}
		return results;
	},
};
