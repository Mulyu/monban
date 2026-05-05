import type { RuleResult } from "../../engine/types.js";
import { extractStepUses, loadWorkflows } from "./internal/workflow.js";
import type { GithubForbiddenRule } from "./types.js";

export async function checkGithubForbidden(
	rules: GithubForbiddenRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const prefixes = Array.isArray(rule.uses) ? rule.uses : [rule.uses];
		const workflows = await loadWorkflows(rule.path, cwd, globalExclude);
		for (const wf of workflows) {
			for (const uses of extractStepUses(wf.doc)) {
				for (const prefix of prefixes) {
					if (uses.startsWith(prefix)) {
						results.push({
							rule: "actions.forbidden",
							path: wf.file,
							message: rule.message ?? `禁止アクション検出: ${uses}`,
							severity: rule.severity ?? "error",
						});
						break;
					}
				}
			}
		}
	}

	return results;
}
