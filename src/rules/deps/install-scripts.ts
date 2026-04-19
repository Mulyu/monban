import type { DepsInstallScriptsRule, RuleResult } from "../../types.js";
import { formatLocation, loadManifests } from "./manifest-loader.js";

const DEFAULT_FORBIDDEN = ["preinstall", "install", "postinstall", "prepare"];

export async function checkDepsInstallScripts(
	rules: DepsInstallScriptsRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const severity = rule.severity ?? "warn";
		const forbidden = new Set(rule.forbidden ?? DEFAULT_FORBIDDEN);
		const manifests = await loadManifests(
			rule.path,
			cwd,
			globalExclude,
			rule.exclude,
		);

		for (const manifest of manifests) {
			if (!manifest.installScripts) continue;
			for (const script of manifest.installScripts) {
				if (!forbidden.has(script.hook)) continue;
				results.push({
					rule: "install_scripts",
					path: formatLocation(manifest.file, script.line),
					message:
						rule.message ??
						`${script.hook} ライフサイクルフックが宣言されています (任意コード実行の攻撃面)。`,
					severity,
				});
			}
		}
	}

	return results;
}
