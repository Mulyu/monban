import {
	EcosystemeClient,
	OfflineRegistryClient,
	type RegistryClient,
} from "../../registry/index.js";
import type { DepsConfig, RuleResult } from "../../types.js";
import { checkDepsAllowed } from "./allowed.js";
import { checkDepsCrossEcosystem } from "./cross-ecosystem.js";
import { checkDepsDenied } from "./denied.js";
import { checkDepsExistence } from "./existence.js";
import { checkDepsFreshness } from "./freshness.js";
import { checkDepsPopularity } from "./popularity.js";
import { checkDepsTyposquat } from "./typosquat.js";

export interface DepsRuleResult {
	name: string;
	results: RuleResult[];
}

export interface DepsRunOptions {
	offline?: boolean;
	registry?: RegistryClient;
}

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
	denied: (c, cwd, ex) => checkDepsDenied(c.denied ?? [], cwd, ex),
};

export const DEPS_RULE_NAMES = Object.keys(RULE_RUNNERS);

export async function runDepsRules(
	config: DepsConfig,
	cwd: string,
	globalExclude: string[],
	ruleFilter?: string,
	options: DepsRunOptions = {},
): Promise<DepsRuleResult[]> {
	const offline = options.offline ?? false;
	const registry =
		options.registry ??
		(offline ? new OfflineRegistryClient() : new EcosystemeClient());

	const names = ruleFilter ? [ruleFilter] : DEPS_RULE_NAMES;
	const results: DepsRuleResult[] = [];

	for (const name of names) {
		const runner = RULE_RUNNERS[name];
		if (!runner) {
			throw new Error(`Unknown deps rule: ${name}`);
		}
		if (offline && NETWORK_RULES.has(name)) {
			results.push({ name, results: [] });
			continue;
		}
		const ruleResults = await runner(config, cwd, globalExclude, registry);
		results.push({ name, results: ruleResults });
	}

	return results;
}
