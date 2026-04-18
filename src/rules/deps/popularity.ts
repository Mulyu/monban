import { networkWarning } from "../../errors.js";
import type { RegistryClient } from "../../registry/index.js";
import { RegistryLookupError } from "../../registry/index.js";
import type { DepsPopularityRule, RuleResult } from "../../types.js";
import { formatLocation, loadManifests } from "./manifest-loader.js";

const DEFAULT_MIN_DOWNLOADS = 100;

export async function checkDepsPopularity(
	rules: DepsPopularityRule[],
	cwd: string,
	globalExclude: string[],
	registry: RegistryClient,
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const severity = rule.severity ?? "warn";
		const min = rule.min_downloads ?? DEFAULT_MIN_DOWNLOADS;
		const manifests = await loadManifests(rule.path, cwd, globalExclude);

		for (const manifest of manifests) {
			for (const entry of manifest.entries) {
				try {
					const info = await registry.lookup(entry.name, entry.ecosystem);
					if (!info.exists || typeof info.downloads !== "number") continue;
					if (info.downloads < min) {
						results.push({
							rule: "popularity",
							path: formatLocation(manifest.file, entry.line),
							message: `${entry.name}: 週間ダウンロード数 ${info.downloads}（閾値 ${min} 未満）。`,
							severity,
						});
					}
				} catch (err) {
					if (err instanceof RegistryLookupError) {
						results.push(
							networkWarning(
								"popularity",
								formatLocation(manifest.file, entry.line),
								`${entry.name}: 人気度照合に失敗しました (${err.message})。`,
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
