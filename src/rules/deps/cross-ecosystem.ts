import { networkWarning } from "../../errors.js";
import type { RegistryClient } from "../../registry/client.js";
import { RegistryLookupError } from "../../registry/client.js";
import type { DepsCrossEcosystemRule, RuleResult } from "../../types.js";
import { formatLocation, loadManifests } from "./utils.js";

export async function checkDepsCrossEcosystem(
	rules: DepsCrossEcosystemRule[],
	cwd: string,
	globalExclude: string[],
	registry: RegistryClient,
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const severity = rule.severity ?? "warn";
		const manifests = await loadManifests(rule.path, cwd, globalExclude);

		for (const manifest of manifests) {
			for (const entry of manifest.entries) {
				try {
					const info = await registry.lookup(entry.name, entry.ecosystem);
					if (info.exists) continue;
					const across = await registry.lookupAcross(entry.name);
					const elsewhere = across.filter(
						(i) => i.exists && i.ecosystem !== entry.ecosystem,
					);
					if (elsewhere.length > 0) {
						const others = elsewhere.map((i) => i.ecosystem).join(", ");
						results.push({
							rule: "cross_ecosystem",
							path: formatLocation(manifest.file, entry.line),
							message: `${entry.name}: ${entry.ecosystem} には存在しませんが ${others} に同名パッケージがあります。`,
							severity,
						});
					}
				} catch (err) {
					if (err instanceof RegistryLookupError) {
						results.push(
							networkWarning(
								"cross_ecosystem",
								formatLocation(manifest.file, entry.line),
								`${entry.name}: エコシステム横断照合に失敗しました (${err.message})。`,
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
