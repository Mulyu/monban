import type { AgentRuleResult } from "./rules/agent/index.js";
import type { ContentRuleResult } from "./rules/content/index.js";
import type { DepsRuleResult } from "./rules/deps/index.js";
import type { DocRuleResult } from "./rules/doc/index.js";
import type { GitRuleResult } from "./rules/git/index.js";
import type { GithubRuleResult } from "./rules/github/index.js";
import type { PathRuleResult } from "./rules/path/index.js";
import type { RuntimeRuleResult } from "./rules/runtime/index.js";

export type CategoryRuleResult =
	| PathRuleResult
	| ContentRuleResult
	| DocRuleResult
	| GithubRuleResult
	| DepsRuleResult
	| GitRuleResult
	| AgentRuleResult
	| RuntimeRuleResult;

export interface CategoryGroup {
	category: string;
	results: CategoryRuleResult[];
}

interface ViolationStats {
	totalErrors: number;
	totalWarns: number;
	totalViolations: number;
	passedCount: number;
}

const CATEGORY_TITLES: Record<string, string> = {
	path: "monban path — パスチェック",
	content: "monban content — コンテンツチェック",
	doc: "monban doc — ドキュメントチェック",
	github: "monban github — GitHub チェック",
	deps: "monban deps — 依存チェック",
	git: "monban git — Git チェック",
	agent: "monban agent — エージェントチェック",
	runtime: "monban runtime — ランタイムチェック",
};

export function reportCategory(
	category: string,
	ruleResults: CategoryRuleResult[],
	json: boolean,
): void {
	const title = CATEGORY_TITLES[category] ?? `monban ${category}`;
	if (json) {
		reportJson(ruleResults);
		return;
	}
	reportText(title, ruleResults);
}

export function reportAllResults(groups: CategoryGroup[], json: boolean): void {
	if (json) {
		reportAllJson(groups);
		return;
	}
	reportAllText(groups);
}

function reportJson(ruleResults: CategoryRuleResult[]): void {
	const output = ruleResults.map(toJsonRuleEntry);
	console.log(JSON.stringify(output, null, 2));
}

function reportAllJson(groups: CategoryGroup[]): void {
	const output: Record<string, unknown> = {};
	for (const g of groups) {
		output[g.category] = g.results.map(toJsonRuleEntry);
	}
	console.log(JSON.stringify(output, null, 2));
}

function toJsonRuleEntry(r: CategoryRuleResult) {
	return {
		rule: r.name,
		violations: r.results.map((v) => ({
			path: v.path,
			message: v.message,
			severity: v.severity,
		})),
	};
}

function reportText(title: string, ruleResults: CategoryRuleResult[]): void {
	const stats = computeStats(ruleResults);
	console.log(`\n${title}\n`);
	printRuleList(ruleResults, "  ");
	if (stats.totalViolations > 0) {
		printViolationDetails(ruleResults);
	}
	printSummaryFooter(stats, ruleResults.length);
}

function reportAllText(groups: CategoryGroup[]): void {
	const allRuleResults = groups.flatMap((g) => g.results);
	const stats = computeStats(allRuleResults);

	console.log("\nmonban all — 全チェック\n");

	for (const g of groups) {
		console.log(`  ${g.category}`);
		printRuleList(g.results, "    ");
	}

	if (stats.totalViolations > 0) {
		printViolationDetails(allRuleResults);
	}

	printSummaryFooter(stats, allRuleResults.length);
}

function computeStats(ruleResults: CategoryRuleResult[]): ViolationStats {
	const allResults = ruleResults.flatMap((r) => r.results);
	const totalErrors = allResults.filter((r) => r.severity === "error").length;
	const totalWarns = allResults.filter((r) => r.severity === "warn").length;
	return {
		totalErrors,
		totalWarns,
		totalViolations: totalErrors + totalWarns,
		passedCount: ruleResults.filter((r) => r.results.length === 0).length,
	};
}

function printRuleList(
	ruleResults: CategoryRuleResult[],
	indent: string,
): void {
	for (const rule of ruleResults) {
		if (rule.results.length === 0) {
			console.log(`${indent}✓ ${rule.name}`);
			continue;
		}
		const errors = rule.results.filter((r) => r.severity === "error").length;
		const warns = rule.results.filter((r) => r.severity === "warn").length;
		const parts: string[] = [];
		if (errors > 0) parts.push(`${errors} violation${errors > 1 ? "s" : ""}`);
		if (warns > 0)
			parts.push(`${warns} violation${warns > 1 ? "s" : ""} (warn)`);
		console.log(`${indent}✗ ${rule.name.padEnd(22)} ${parts.join(", ")}`);
	}
}

function printViolationDetails(ruleResults: CategoryRuleResult[]): void {
	console.log("");
	for (const rule of ruleResults) {
		for (const v of rule.results) {
			const prefix = v.severity === "error" ? "ERROR" : "WARN ";
			console.log(`${prefix} [${v.rule}] ${v.path}`);
			console.log(`  ${v.message}`);
			console.log("");
		}
	}
}

function printSummaryFooter(stats: ViolationStats, totalRules: number): void {
	console.log("━".repeat(41));
	console.log("");

	if (stats.totalViolations === 0) {
		console.log("  All checks passed.");
	} else {
		const parts: string[] = [];
		if (stats.totalErrors > 0)
			parts.push(
				`${stats.totalErrors} error${stats.totalErrors > 1 ? "s" : ""}`,
			);
		if (stats.totalWarns > 0)
			parts.push(
				`${stats.totalWarns} warning${stats.totalWarns > 1 ? "s" : ""}`,
			);
		console.log(`  ${stats.totalViolations} violations (${parts.join(", ")})`);
		console.log(`  ${stats.passedCount}/${totalRules} rules passed`);
	}

	console.log("");
}

export function hasErrors(ruleResults: CategoryRuleResult[]): boolean {
	return ruleResults.some((r) => r.results.some((v) => v.severity === "error"));
}

export function hasErrorsInGroups(groups: CategoryGroup[]): boolean {
	return groups.some((g) => hasErrors(g.results));
}
