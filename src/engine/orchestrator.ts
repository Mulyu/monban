import { CHECKS } from "../rules/index.js";
import { applyDiffFilter, computeDiffScope } from "./diff.js";
import type {
	CategoryGroup,
	CheckRunOptions,
	DiffGranularity,
	DiffScope,
	MonbanConfig,
	RuleGroupResult,
} from "./types.js";

export type { CategoryGroup };

export interface OrchestratorOpts {
	diff?: string | boolean;
	diffGranularity?: string;
	rule?: string;
	offline?: boolean;
}

export const ALL_CATEGORIES: readonly string[] = CHECKS.map((c) => c.category);

export async function runCategory(
	cwd: string,
	category: string,
	config: MonbanConfig,
	opts: OrchestratorOpts,
): Promise<CategoryGroup | null> {
	const check = CHECKS.find((c) => c.category === category);
	if (!check) {
		throw new Error(`Unknown category: ${category}`);
	}
	const scope = check.category === "git" ? null : resolveDiffScope(cwd, opts);
	const runOpts: CheckRunOptions = {
		globalExclude: config.exclude ?? [],
		ruleFilter: opts.rule,
		diff: opts.diff,
		offline: opts.offline,
	};
	const results = await check.run(config, cwd, runOpts);
	if (results === null) return null;
	return { category, results: filter(results, scope) };
}

export async function runAll(
	cwd: string,
	config: MonbanConfig,
	opts: OrchestratorOpts,
): Promise<CategoryGroup[]> {
	const baseOpts: OrchestratorOpts = { ...opts, rule: undefined };
	const groups: CategoryGroup[] = [];
	for (const check of CHECKS) {
		const group = await runCategory(cwd, check.category, config, baseOpts);
		if (group) groups.push(group);
	}
	return groups;
}

function resolveDiffScope(
	cwd: string,
	opts: OrchestratorOpts,
): DiffScope | null {
	if (opts.diff === undefined) return null;
	const base = typeof opts.diff === "string" ? opts.diff : undefined;
	const granularity = normalizeGranularity(opts.diffGranularity);
	const scope = computeDiffScope(cwd, { base, granularity });
	if (!scope) {
		console.error(
			"warn: --diff was specified but no diff base could be resolved; running full scan.",
		);
		return null;
	}
	return scope;
}

function normalizeGranularity(raw: string | undefined): DiffGranularity {
	if (raw === "line") return "line";
	return "file";
}

function filter(
	results: RuleGroupResult[],
	scope: DiffScope | null,
): RuleGroupResult[] {
	if (!scope) return results;
	return results.map((r) => ({
		...r,
		results: applyDiffFilter(r.results, scope),
	}));
}
