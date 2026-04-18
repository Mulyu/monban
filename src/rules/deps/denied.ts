import type { DepsDeniedRule, RuleResult } from "../../types.js";
import { formatLocation, loadManifests } from "./manifest-loader.js";
import { matchAny } from "./match.js";

export async function checkDepsDenied(
	rules: DepsDeniedRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const severity = rule.severity ?? "error";
		const manifests = await loadManifests(rule.path, cwd, globalExclude);

		for (const manifest of manifests) {
			for (const entry of manifest.entries) {
				if (!matchAny(entry.name, rule.names)) continue;
				results.push({
					rule: "denied",
					path: formatLocation(manifest.file, entry.line),
					message: rule.message ?? `${entry.name}: denylist に含まれています。`,
					severity,
				});
			}
		}
	}

	return results;
}
