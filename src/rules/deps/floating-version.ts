import type { DepsFloatingVersionRule, RuleResult } from "../../types.js";
import { formatLocation, loadManifests } from "./manifest-loader.js";

export async function checkDepsFloatingVersion(
	rules: DepsFloatingVersionRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const severity = rule.severity ?? "warn";
		const manifests = await loadManifests(
			rule.path,
			cwd,
			globalExclude,
			rule.exclude,
		);

		for (const manifest of manifests) {
			for (const entry of manifest.entries) {
				const reason = detect(entry.version, manifest.ecosystem);
				if (!reason) continue;
				results.push({
					rule: "floating_version",
					path: formatLocation(manifest.file, entry.line),
					message:
						rule.message ??
						`${entry.name}: バージョンが浮動しています (${reason})。`,
					severity,
				});
			}
		}
	}

	return results;
}

function detect(version: string | undefined, ecosystem: string): string | null {
	if (!version) return null;
	const v = version.trim();
	if (v === "" || v === "*") return "wildcard";
	if (v.toLowerCase() === "latest") return "latest";

	if (
		ecosystem === "npm" ||
		ecosystem === "cargo" ||
		ecosystem === "rubygems"
	) {
		if (v.startsWith("^")) return "caret range";
		if (v.startsWith("~")) return "tilde range";
		if (v.includes("x") && /^[\d.]*x/.test(v)) return "x-range";
	}

	if (ecosystem === "pypi") {
		// e.g., ">=1.0" without upper bound
		if (/^>=?\s*[\d.]+$/.test(v)) return "unbounded lower";
	}

	if (/^>=?\s*[\d.]+$/.test(v) && ecosystem !== "pypi") {
		return "unbounded lower";
	}

	return null;
}
