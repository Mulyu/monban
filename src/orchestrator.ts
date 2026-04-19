import { applyDiffFilter, computeDiffScope } from "./diff.js";
import type { CategoryGroup, CategoryRuleResult } from "./reporter.js";
import { runAgentRules } from "./rules/agent/index.js";
import { runContentRules } from "./rules/content/index.js";
import { runDepsRules } from "./rules/deps/index.js";
import { runDocRules } from "./rules/doc/index.js";
import { runGitRules } from "./rules/git/index.js";
import { runGithubRules } from "./rules/github/index.js";
import { runPathRules } from "./rules/path/index.js";
import type { DiffGranularity, DiffScope, MonbanConfig } from "./types.js";

export type Category =
	| "path"
	| "content"
	| "doc"
	| "github"
	| "deps"
	| "git"
	| "agent";

export const ALL_CATEGORIES: Category[] = [
	"path",
	"content",
	"doc",
	"github",
	"deps",
	"git",
	"agent",
];

export interface OrchestratorOpts {
	diff?: string | boolean;
	diffGranularity?: string;
	rule?: string;
	offline?: boolean;
}

export async function runCategory(
	cwd: string,
	category: Category,
	config: MonbanConfig,
	opts: OrchestratorOpts,
): Promise<CategoryGroup | null> {
	const globalExclude = config.exclude ?? [];
	const scope = category === "git" ? null : resolveDiffScope(cwd, opts);
	const results = await execute(cwd, category, config, globalExclude, opts);
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
	for (const category of ALL_CATEGORIES) {
		const group = await runCategory(cwd, category, config, baseOpts);
		if (group) groups.push(group);
	}
	return groups;
}

async function execute(
	cwd: string,
	category: Category,
	config: MonbanConfig,
	globalExclude: string[],
	opts: OrchestratorOpts,
): Promise<CategoryRuleResult[] | null> {
	switch (category) {
		case "path":
			if (!config.path) return null;
			return runPathRules(config.path, cwd, globalExclude, opts.rule);
		case "content":
			if (!config.content) return null;
			return runContentRules(config.content, cwd, globalExclude, opts.rule);
		case "doc":
			if (!config.doc) return null;
			return runDocRules(config.doc, cwd, globalExclude, opts.rule);
		case "github":
			if (!config.github) return null;
			return runGithubRules(config.github, cwd, globalExclude, opts.rule);
		case "deps":
			if (!config.deps) return null;
			return runDepsRules(config.deps, cwd, globalExclude, opts.rule, {
				offline: opts.offline,
			});
		case "git":
			if (!config.git) return null;
			return runGitRules(config.git, cwd, opts.rule, { diff: opts.diff });
		case "agent":
			if (!config.agent) return null;
			return runAgentRules(config.agent, cwd, globalExclude, opts.rule);
	}
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

function filter<T extends CategoryRuleResult>(
	results: T[],
	scope: DiffScope | null,
): T[] {
	if (!scope) return results;
	return results.map(
		(r) => ({ ...r, results: applyDiffFilter(r.results, scope) }) as T,
	);
}
