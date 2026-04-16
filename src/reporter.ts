import type { RuleResult } from "./types.js";

export function reportResults(results: RuleResult[]): void {
	if (results.length === 0) {
		console.log("✓ All checks passed.");
		return;
	}

	for (const r of results) {
		const icon = r.severity === "error" ? "✗" : "⚠";
		console.log(`${icon} [${r.rule}] ${r.path}`);
		console.log(`  ${r.message}`);
	}

	const errors = results.filter((r) => r.severity === "error").length;
	const warns = results.filter((r) => r.severity === "warn").length;
	console.log(`\n${errors} error(s), ${warns} warning(s)`);
}

export function hasErrors(results: RuleResult[]): boolean {
	return results.some((r) => r.severity === "error");
}
