import type { RuleResult, Severity } from "../../engine/types.js";
import { getCommits } from "./commits.js";
import type { GitCommitAuthorRule } from "./types.js";

export function checkGitCommitAuthor(
	rule: GitCommitAuthorRule | undefined,
	cwd: string,
	range: string,
): RuleResult[] {
	if (!rule) return [];
	if (!rule.allowed && !rule.forbidden) return [];

	const severity: Severity = rule.severity ?? "error";
	const ignoreMerges = rule.ignore_merges ?? true;
	const allowedRes = rule.allowed?.map((p) => new RegExp(p));
	const forbiddenRes = rule.forbidden?.map((p) => new RegExp(p));

	const results: RuleResult[] = [];
	for (const commit of getCommits(cwd, range)) {
		if (ignoreMerges && commit.isMerge) continue;
		const email = commit.authorEmail;

		if (allowedRes && !allowedRes.some((re) => re.test(email))) {
			results.push({
				rule: "commit.author",
				path: commit.shortSha,
				message:
					rule.message ?? `author email が allowlist に一致しません: ${email}`,
				severity,
			});
		}

		if (forbiddenRes) {
			for (const re of forbiddenRes) {
				if (re.test(email)) {
					results.push({
						rule: "commit.author",
						path: commit.shortSha,
						message:
							rule.message ??
							`author email が forbidden パターンに一致: ${email} (${re.source})`,
						severity,
					});
					break;
				}
			}
		}
	}

	return results;
}
