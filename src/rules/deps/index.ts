import type { Check, RuleGroupResult, RuleResult } from "../../engine/types.js";
import { checkDepsAllowed } from "./allowed.js";
import { checkDepsCrossEcosystem } from "./cross-ecosystem.js";
import { checkDepsExistence } from "./existence.js";
import { checkDepsFloatingVersion } from "./floating-version.js";
import { checkDepsForbidden } from "./forbidden.js";
import { checkDepsFreshness } from "./freshness.js";
import { checkDepsGitDependency } from "./git-dependency.js";
import { checkDepsInstallScripts } from "./install-scripts.js";
import { checkDepsPopularity } from "./popularity.js";
import {
	EcosystemeClient,
	OfflineRegistryClient,
	type RegistryClient,
} from "./registry/index.js";
import { validateDepsConfig } from "./schema.js";
import type { DepsConfig } from "./types.js";
import { checkDepsTyposquat } from "./typosquat.js";

const NETWORK_RULES = new Set([
	"existence",
	"freshness",
	"popularity",
	"cross_ecosystem",
]);

type RuleRunner = (
	config: DepsConfig,
	cwd: string,
	globalExclude: string[],
	registry: RegistryClient,
) => Promise<RuleResult[]>;

const RULE_RUNNERS: Record<string, RuleRunner> = {
	existence: (c, cwd, ex, reg) =>
		checkDepsExistence(c.existence ?? [], cwd, ex, reg),
	freshness: (c, cwd, ex, reg) =>
		checkDepsFreshness(c.freshness ?? [], cwd, ex, reg),
	popularity: (c, cwd, ex, reg) =>
		checkDepsPopularity(c.popularity ?? [], cwd, ex, reg),
	cross_ecosystem: (c, cwd, ex, reg) =>
		checkDepsCrossEcosystem(c.cross_ecosystem ?? [], cwd, ex, reg),
	typosquat: (c, cwd, ex) => checkDepsTyposquat(c.typosquat ?? [], cwd, ex),
	allowed: (c, cwd, ex) => checkDepsAllowed(c.allowed ?? [], cwd, ex),
	forbidden: (c, cwd, ex) => checkDepsForbidden(c.forbidden ?? [], cwd, ex),
	install_scripts: (c, cwd, ex) =>
		checkDepsInstallScripts(c.install_scripts ?? [], cwd, ex),
	git_dependency: (c, cwd, ex) =>
		checkDepsGitDependency(c.git_dependency ?? [], cwd, ex),
	floating_version: (c, cwd, ex) =>
		checkDepsFloatingVersion(c.floating_version ?? [], cwd, ex),
};

const RULE_NAMES = Object.keys(RULE_RUNNERS);

export const depsCheck: Check = {
	category: "deps",
	description:
		"依存チェック: マニフェストの依存名をレジストリで検証（実在・鮮度・人気度・類似性）",
	ruleNames: RULE_NAMES,
	validate: validateDepsConfig,
	run: async (config, cwd, opts) => {
		if (!config.deps) return null;
		const offline = opts.offline ?? false;
		const registry = offline
			? new OfflineRegistryClient()
			: new EcosystemeClient();
		const names = opts.ruleFilter ? [opts.ruleFilter] : RULE_NAMES;
		const results: RuleGroupResult[] = [];
		for (const name of names) {
			const runner = RULE_RUNNERS[name];
			if (!runner) {
				throw new Error(`Unknown deps rule: ${name}`);
			}
			if (offline && NETWORK_RULES.has(name)) {
				results.push({ name, results: [] });
				continue;
			}
			const ruleResults = await runner(
				config.deps,
				cwd,
				opts.globalExclude,
				registry,
			);
			results.push({ name, results: ruleResults });
		}
		return results;
	},
};
