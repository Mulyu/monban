import type { GithubConcurrencyRule, RuleResult } from "../../types.js";
import { loadWorkflows } from "./workflow.js";

export async function checkGithubConcurrency(
	rules: GithubConcurrencyRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const workflows = await loadWorkflows(rule.path, cwd, globalExclude);

		for (const wf of workflows) {
			if (!wf.doc || typeof wf.doc !== "object") continue;
			const root = wf.doc as Record<string, unknown>;
			if (root.concurrency === undefined) {
				results.push({
					rule: "actions.concurrency",
					path: wf.file,
					message: "concurrency: が宣言されていません。",
					severity: "error",
					fail_text: rule.fail_text,
					docs_url: rule.docs_url,
				});
			}
		}
	}

	return results;
}
