import type { PathRuleResult } from "./rules/path/index.js";

export function reportPathResults(
	ruleResults: PathRuleResult[],
	json: boolean,
): void {
	if (json) {
		reportJson(ruleResults);
		return;
	}
	reportText(ruleResults);
}

function reportJson(ruleResults: PathRuleResult[]): void {
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

function reportText(ruleResults: PathRuleResult[]): void {
	const allResults = ruleResults.flatMap((r) => r.results);
	const totalErrors = allResults.filter((r) => r.severity === "error").length;
	const totalWarns = allResults.filter((r) => r.severity === "warn").length;
	const totalViolations = totalErrors + totalWarns;
	const passedCount = ruleResults.filter((r) => r.results.length === 0).length;

	console.log("\nmonban path — パスチェック\n");

	for (const rule of ruleResults) {
		const count = rule.results.length;
		if (count === 0) {
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

	if (totalViolations > 0) {
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
		console.log(`  ${passedCount}/${ruleResults.length} rules passed`);
	}

	console.log("");
}

export function hasErrors(ruleResults: PathRuleResult[]): boolean {
	return ruleResults.some((r) => r.results.some((v) => v.severity === "error"));
}
