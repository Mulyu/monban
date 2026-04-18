import type { ContentRuleResult } from "./rules/content/index.js";
import type { DepsRuleResult } from "./rules/deps/index.js";
import type { DocRuleResult } from "./rules/doc/index.js";
import type { GithubRuleResult } from "./rules/github/index.js";
import type { PathRuleResult } from "./rules/path/index.js";

type CategoryRuleResult =
	| PathRuleResult
	| ContentRuleResult
	| DocRuleResult
	| GithubRuleResult
	| DepsRuleResult;

export interface CategoryGroup {
	category: string;
	results: CategoryRuleResult[];
}

export function reportPathResults(
	ruleResults: PathRuleResult[],
	json: boolean,
): void {
	reportResults("monban path — パスチェック", ruleResults, json);
}

export function reportContentResults(
	ruleResults: ContentRuleResult[],
	json: boolean,
): void {
	reportResults("monban content — コンテンツチェック", ruleResults, json);
}

export function reportDocResults(
	ruleResults: DocRuleResult[],
	json: boolean,
): void {
	reportResults("monban doc — ドキュメントチェック", ruleResults, json);
}

export function reportGithubResults(
	ruleResults: GithubRuleResult[],
	json: boolean,
): void {
	reportResults("monban github — GitHub チェック", ruleResults, json);
}

export function reportDepsResults(
	ruleResults: DepsRuleResult[],
	json: boolean,
): void {
	reportResults("monban deps — 依存チェック", ruleResults, json);
}

export function reportAllResults(groups: CategoryGroup[], json: boolean): void {
	if (json) {
		reportAllJson(groups);
		return;
	}
	reportAllText(groups);
}

function reportResults(
	title: string,
	ruleResults: CategoryRuleResult[],
	json: boolean,
): void {
	if (json) {
		reportJson(ruleResults);
		return;
	}
	reportText(title, ruleResults);
}

function reportJson(ruleResults: CategoryRuleResult[]): void {
	const output = ruleResults.map((r) => ({
		rule: r.name,
		violations: r.results.map((v) => ({
			path: v.path,
			message: v.message,
			severity: v.severity,
		})),
	}));
	console.log(JSON.stringify(output, null, 2));
}

function reportAllJson(groups: CategoryGroup[]): void {
	const output: Record<string, unknown> = {};
	for (const g of groups) {
		output[g.category] = g.results.map((r) => ({
			rule: r.name,
			violations: r.results.map((v) => ({
				path: v.path,
				message: v.message,
				severity: v.severity,
			})),
		}));
	}
	console.log(JSON.stringify(output, null, 2));
}

function reportText(title: string, ruleResults: CategoryRuleResult[]): void {
	const allResults = ruleResults.flatMap((r) => r.results);
	const totalErrors = allResults.filter((r) => r.severity === "error").length;
	const totalWarns = allResults.filter((r) => r.severity === "warn").length;
	const totalViolations = totalErrors + totalWarns;
	const passedCount = ruleResults.filter((r) => r.results.length === 0).length;

	console.log(`\n${title}\n`);

	printRuleList(ruleResults);

	if (totalViolations > 0) {
		printViolationDetails(ruleResults);
	}

	printSummaryFooter(
		totalViolations,
		totalErrors,
		totalWarns,
		passedCount,
		ruleResults.length,
	);
}

function reportAllText(groups: CategoryGroup[]): void {
	const allRuleResults = groups.flatMap((g) => g.results);
	const allResults = allRuleResults.flatMap((r) => r.results);
	const totalErrors = allResults.filter((r) => r.severity === "error").length;
	const totalWarns = allResults.filter((r) => r.severity === "warn").length;
	const totalViolations = totalErrors + totalWarns;
	const passedCount = allRuleResults.filter(
		(r) => r.results.length === 0,
	).length;

	console.log("\nmonban all — 全チェック\n");

	for (const g of groups) {
		console.log(`  ${g.category}`);
		for (const rule of g.results) {
			if (rule.results.length === 0) {
				console.log(`    ✓ ${rule.name}`);
			} else {
				const errors = rule.results.filter(
					(r) => r.severity === "error",
				).length;
				const warns = rule.results.filter((r) => r.severity === "warn").length;
				const parts: string[] = [];
				if (errors > 0)
					parts.push(`${errors} violation${errors > 1 ? "s" : ""}`);
				if (warns > 0)
					parts.push(`${warns} violation${warns > 1 ? "s" : ""} (warn)`);
				console.log(`    ✗ ${rule.name.padEnd(12)} ${parts.join(", ")}`);
			}
		}
	}

	if (totalViolations > 0) {
		console.log("");
		for (const g of groups) {
			for (const rule of g.results) {
				for (const v of rule.results) {
					const prefix = v.severity === "error" ? "ERROR" : "WARN ";
					console.log(`${prefix} [${v.rule}] ${v.path}`);
					console.log(`  ${v.message}`);
					console.log("");
				}
			}
		}
	}

	printSummaryFooter(
		totalViolations,
		totalErrors,
		totalWarns,
		passedCount,
		allRuleResults.length,
	);
}

function printRuleList(ruleResults: CategoryRuleResult[]): void {
	for (const rule of ruleResults) {
		if (rule.results.length === 0) {
			console.log(`  ✓ ${rule.name}`);
		} else {
			const errors = rule.results.filter((r) => r.severity === "error").length;
			const warns = rule.results.filter((r) => r.severity === "warn").length;
			const parts: string[] = [];
			if (errors > 0) parts.push(`${errors} violation${errors > 1 ? "s" : ""}`);
			if (warns > 0)
				parts.push(`${warns} violation${warns > 1 ? "s" : ""} (warn)`);
			console.log(`  ✗ ${rule.name.padEnd(12)} ${parts.join(", ")}`);
		}
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

function printSummaryFooter(
	totalViolations: number,
	totalErrors: number,
	totalWarns: number,
	passedCount: number,
	totalRules: number,
): void {
	console.log("━".repeat(41));
	console.log("");

	if (totalViolations === 0) {
		console.log("  All checks passed.");
	} else {
		const parts: string[] = [];
		if (totalErrors > 0)
			parts.push(`${totalErrors} error${totalErrors > 1 ? "s" : ""}`);
		if (totalWarns > 0)
			parts.push(`${totalWarns} warning${totalWarns > 1 ? "s" : ""}`);
		console.log(`  ${totalViolations} violations (${parts.join(", ")})`);
		console.log(`  ${passedCount}/${totalRules} rules passed`);
	}

	console.log("");
}

export function hasErrors(ruleResults: CategoryRuleResult[]): boolean {
	return ruleResults.some((r) => r.results.some((v) => v.severity === "error"));
}

export function hasErrorsInGroups(groups: CategoryGroup[]): boolean {
	return groups.some((g) => hasErrors(g.results));
}
