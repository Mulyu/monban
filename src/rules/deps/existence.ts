import { networkWarning } from "../../errors.js";
import type { RegistryClient } from "../../registry/client.js";
import { RegistryLookupError } from "../../registry/client.js";
import type { DepsExistenceRule, RuleResult } from "../../types.js";
import { formatLocation, loadManifests, matchAny } from "./utils.js";

export async function checkDepsExistence(
	rules: DepsExistenceRule[],
	cwd: string,
	globalExclude: string[],
	registry: RegistryClient,
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const severity = rule.severity ?? "error";
		const excludePatterns = rule.exclude ?? [];
		const manifests = await loadManifests(rule.path, cwd, globalExclude);

		for (const manifest of manifests) {
			for (const entry of manifest.entries) {
				if (matchAny(entry.name, excludePatterns)) continue;
				try {
					const info = await registry.lookup(entry.name, entry.ecosystem);
					if (!info.exists) {
						results.push({
							rule: "existence",
							path: formatLocation(manifest.file, entry.line),
							message: `${entry.name}: ${entry.ecosystem} レジストリに存在しません。`,
							severity,
						});
					}
				} catch (err) {
					if (err instanceof RegistryLookupError) {
						results.push(
							networkWarning(
								"existence",
								formatLocation(manifest.file, entry.line),
								`${entry.name}: レジストリ照合に失敗しました (${err.message})。`,
							),
						);
					} else {
						throw err;
					}
				}
			}
		}
	}

	return results;
}
