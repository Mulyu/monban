import type { DepsAllowedRule, RuleResult } from "../../types.js";
import { formatLocation, loadManifests, matchAny } from "./utils.js";

export async function checkDepsAllowed(
	rules: DepsAllowedRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const severity = rule.severity ?? "error";
		const manifests = await loadManifests(rule.path, cwd, globalExclude);

		for (const manifest of manifests) {
			for (const entry of manifest.entries) {
				if (matchAny(entry.name, rule.names)) continue;
				results.push({
					rule: "allowed",
					path: formatLocation(manifest.file, entry.line),
					message: `${entry.name}: allowlist に含まれていません。`,
					severity,
				});
			}
		}
	}

	return results;
}
