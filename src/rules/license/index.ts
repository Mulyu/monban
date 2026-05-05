import type { LicenseConfig, RuleResult } from "../../types.js";
import { checkLicenseFile } from "./file.js";
import { checkLicenseHeader } from "./header.js";

export interface LicenseRuleResult {
	name: string;
	results: RuleResult[];
}

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

export const LICENSE_RULE_NAMES = Object.keys(RULE_RUNNERS);

export async function runLicenseRules(
	config: LicenseConfig,
	cwd: string,
	globalExclude: string[],
	ruleFilter?: string,
): Promise<LicenseRuleResult[]> {
	const names = ruleFilter ? [ruleFilter] : LICENSE_RULE_NAMES;
	const results: LicenseRuleResult[] = [];

	for (const name of names) {
		const runner = RULE_RUNNERS[name];
		if (!runner) {
			throw new Error(`Unknown license rule: ${name}`);
		}
		const ruleResults = await runner(config, cwd, globalExclude);
		results.push({ name, results: ruleResults });
	}

	return results;
}
