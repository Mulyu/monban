import type { Check, RuleGroupResult, RuleResult } from "../../engine/types.js";
import { checkLicenseFile } from "./file.js";
import { checkLicenseHeader } from "./header.js";
import { validateLicenseConfig } from "./schema.js";
import type { LicenseConfig } from "./types.js";

const RULE_RUNNERS: Record<
	string,
	(
		config: LicenseConfig,
		cwd: string,
		globalExclude: string[],
	) => Promise<RuleResult[]>
> = {
	file: (c, cwd, ex) => checkLicenseFile(c.file ?? [], cwd, ex),
	header: (c, cwd, ex) => checkLicenseHeader(c.header ?? [], cwd, ex),
};

const RULE_NAMES = Object.keys(RULE_RUNNERS);

export const licenseCheck: Check = {
	category: "license",
	description:
		"ライセンスチェック: LICENSE ファイル・ソースヘッダの SPDX 識別子を検証",
	ruleNames: RULE_NAMES,
	validate: validateLicenseConfig,
	run: async (config, cwd, opts) => {
		if (!config.license) return null;
		const names = opts.ruleFilter ? [opts.ruleFilter] : RULE_NAMES;
		const results: RuleGroupResult[] = [];
		for (const name of names) {
			const runner = RULE_RUNNERS[name];
			if (!runner) {
				throw new Error(`Unknown license rule: ${name}`);
			}
			const ruleResults = await runner(config.license, cwd, opts.globalExclude);
			results.push({ name, results: ruleResults });
		}
		return results;
	},
};
