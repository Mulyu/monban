import { networkWarning } from "../../errors.js";
import type { RegistryClient } from "../../registry/client.js";
import { RegistryLookupError } from "../../registry/client.js";
import type { DepsFreshnessRule, RuleResult } from "../../types.js";
import { formatLocation, loadManifests } from "./utils.js";

const DEFAULT_MAX_AGE_HOURS = 24;

export async function checkDepsFreshness(
	rules: DepsFreshnessRule[],
	cwd: string,
	globalExclude: string[],
	registry: RegistryClient,
	now: Date = new Date(),
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const severity = rule.severity ?? "warn";
		const threshold = rule.max_age_hours ?? DEFAULT_MAX_AGE_HOURS;
		const thresholdMs = threshold * 3600 * 1000;
		const manifests = await loadManifests(rule.path, cwd, globalExclude);

		for (const manifest of manifests) {
			for (const entry of manifest.entries) {
				try {
					const info = await registry.lookup(entry.name, entry.ecosystem);
					if (!info.exists || !info.publishedAt) continue;
					const published = new Date(info.publishedAt).getTime();
					if (Number.isNaN(published)) continue;
					const ageMs = now.getTime() - published;
					if (ageMs < thresholdMs) {
						const ageHours = Math.floor(ageMs / 3600 / 1000);
						results.push({
							rule: "freshness",
							path: formatLocation(manifest.file, entry.line),
							message: `${entry.name}: 公開から ${ageHours} 時間（閾値 ${threshold}h 未満）。`,
							severity,
						});
					}
				} catch (err) {
					if (err instanceof RegistryLookupError) {
						results.push(
							networkWarning(
								"freshness",
								formatLocation(manifest.file, entry.line),
								`${entry.name}: 鮮度照合に失敗しました (${err.message})。`,
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
