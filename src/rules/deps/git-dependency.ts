import type { DepsGitDependencyRule, RuleResult } from "../../types.js";
import { formatLocation, loadManifests } from "./manifest-loader.js";

const GIT_PREFIX = /^(git\+|git:|git@|ssh:\/\/)/;
const FILE_PREFIX = /^(file:|\.{1,2}\/|\/)/;
const HTTP_PREFIX = /^https?:\/\//;
const GITHUB_SHORTHAND = /^(github|gitlab|bitbucket):[\w.-]+\/[\w.-]+/i;

export async function checkDepsGitDependency(
	rules: DepsGitDependencyRule[],
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
				const source = classify(entry.version);
				if (!source) continue;
				results.push({
					rule: "git_dependency",
					path: formatLocation(manifest.file, entry.line),
					message:
						rule.message ??
						`${entry.name}: 非レジストリ依存 (${source}) が検出されました。`,
					severity,
				});
			}
		}
	}

	return results;
}

function classify(version: string | undefined): string | null {
	if (!version) return null;
	const v = version.trim();
	if (GIT_PREFIX.test(v)) return "git";
	if (FILE_PREFIX.test(v)) return "file";
	if (GITHUB_SHORTHAND.test(v)) return "git-shorthand";
	if (HTTP_PREFIX.test(v)) return "url";
	return null;
}
