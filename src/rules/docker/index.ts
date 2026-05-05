import type { RuleResult } from "../../engine/types.js";
import { checkDockerForbidden } from "./forbidden.js";
import { checkDockerHealthcheck } from "./healthcheck.js";
import { checkDockerPinned } from "./pinned.js";
import type { DockerConfig } from "./types.js";
import { checkDockerUser } from "./user.js";

export interface DockerRuleResult {
	name: string;
	results: RuleResult[];
}

const RULE_RUNNERS: Record<
	string,
	(
		config: DockerConfig,
		cwd: string,
		globalExclude: string[],
	) => Promise<RuleResult[]>
> = {
	pinned: (c, cwd, ex) => checkDockerPinned(c.pinned ?? [], cwd, ex),
	user: (c, cwd, ex) => checkDockerUser(c.user ?? [], cwd, ex),
	healthcheck: (c, cwd, ex) =>
		checkDockerHealthcheck(c.healthcheck ?? [], cwd, ex),
	forbidden: (c, cwd, ex) => checkDockerForbidden(c.forbidden ?? [], cwd, ex),
};

export const DOCKER_RULE_NAMES = Object.keys(RULE_RUNNERS);

export async function runDockerRules(
	config: DockerConfig,
	cwd: string,
	globalExclude: string[],
	ruleFilter?: string,
): Promise<DockerRuleResult[]> {
	const names = ruleFilter ? [ruleFilter] : DOCKER_RULE_NAMES;
	const results: DockerRuleResult[] = [];

	for (const name of names) {
		const runner = RULE_RUNNERS[name];
		if (!runner) {
			throw new Error(`Unknown docker rule: ${name}`);
		}
		const ruleResults = await runner(config, cwd, globalExclude);
		results.push({ name, results: ruleResults });
	}

	return results;
}
