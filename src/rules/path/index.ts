import type { Check, RuleGroupResult, RuleResult } from "../../engine/types.js";
import { checkPathCaseConflict } from "./case-conflict.js";
import { checkPathCount } from "./count.js";
import { checkPathDepth } from "./depth.js";
import { checkPathForbidden } from "./forbidden.js";
import { checkPathHash } from "./hash.js";
import { checkPathNaming } from "./naming.js";
import { checkPathRequired } from "./required.js";
import { validatePathConfig } from "./schema.js";
import { checkPathSize } from "./size.js";
import type { PathConfig } from "./types.js";

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
	hash: (c, cwd, ex) => checkPathHash(c.hash ?? [], cwd, ex),
	size: (c, cwd, ex) => checkPathSize(c.size ?? [], cwd, ex),
	case_conflict: (c, cwd, ex) =>
		checkPathCaseConflict(c.case_conflict ?? [], cwd, ex),
};

const RULE_NAMES = Object.keys(RULE_RUNNERS);

export const pathCheck: Check = {
	category: "path",
	description:
		"パスチェック: ファイル・ディレクトリの存在、命名、深度、数を検証",
	ruleNames: RULE_NAMES,
	validate: validatePathConfig,
	run: async (config, cwd, opts) => {
		if (!config.path) return null;
		const names = opts.ruleFilter ? [opts.ruleFilter] : RULE_NAMES;
		const results: RuleGroupResult[] = [];
		for (const name of names) {
			const runner = RULE_RUNNERS[name];
			if (!runner) {
				throw new Error(`Unknown path rule: ${name}`);
			}
			const ruleResults = await runner(config.path, cwd, opts.globalExclude);
			results.push({ name, results: ruleResults });
		}
		return results;
	},
};
