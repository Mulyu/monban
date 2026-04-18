import type { GithubForbiddenRule, RuleResult } from "../../types.js";
import { extractStepUses, loadWorkflows } from "./workflow.js";

export async function checkGithubForbidden(
	rules: GithubForbiddenRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const workflows = await loadWorkflows(rule.path, cwd, globalExclude);
		for (const wf of workflows) {
			for (const uses of extractStepUses(wf.doc)) {
				if (uses.startsWith(rule.uses)) {
					results.push({
						rule: "actions.forbidden",
						path: wf.file,
						message: rule.message ?? `禁止アクション検出: ${uses}`,
						severity: rule.severity ?? "error",
					});
				}
			}
		}
	}

	return results;
}
