import type { Check, RuleGroupResult, RuleResult } from "../../engine/types.js";
import { checkDockerForbidden } from "./forbidden.js";
import { checkDockerHealthcheck } from "./healthcheck.js";
import { checkDockerPinned } from "./pinned.js";
import { validateDockerConfig } from "./schema.js";
import type { DockerConfig } from "./types.js";
import { checkDockerUser } from "./user.js";

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

const RULE_NAMES = Object.keys(RULE_RUNNERS);

export const dockerCheck: Check = {
	category: "docker",
	description:
		"Docker チェック: Dockerfile の FROM ピン留め・USER・HEALTHCHECK・禁止命令を検証",
	ruleNames: RULE_NAMES,
	validate: validateDockerConfig,
	run: async (config, cwd, opts) => {
		if (!config.docker) return null;
		const names = opts.ruleFilter ? [opts.ruleFilter] : RULE_NAMES;
		const results: RuleGroupResult[] = [];
		for (const name of names) {
			const runner = RULE_RUNNERS[name];
			if (!runner) {
				throw new Error(`Unknown docker rule: ${name}`);
			}
			const ruleResults = await runner(config.docker, cwd, opts.globalExclude);
			results.push({ name, results: ruleResults });
		}
		return results;
	},
};
