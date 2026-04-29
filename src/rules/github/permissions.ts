import type { GithubPermissionsRule, RuleResult } from "../../types.js";
import { getJobs, loadWorkflows } from "./internal/workflow.js";

export async function checkGithubPermissions(
	rules: GithubPermissionsRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const required = rule.required ?? true;
		const forbidden = rule.forbidden ?? [];
		const workflows = await loadWorkflows(rule.path, cwd, globalExclude);

		for (const wf of workflows) {
			if (!wf.doc || typeof wf.doc !== "object") continue;
			const root = wf.doc as Record<string, unknown>;
			const topLevel = root.permissions;

			if (required && topLevel === undefined) {
				results.push({
					rule: "actions.permissions",
					path: wf.file,
					message: "permissions: が宣言されていません。",
					severity: rule.severity ?? "error",
				});
			}

			if (typeof topLevel === "string" && forbidden.includes(topLevel)) {
				results.push({
					rule: "actions.permissions",
					path: wf.file,
					message: `禁止された permissions スカラー: ${topLevel}`,
					severity: rule.severity ?? "error",
				});
			}

			for (const [jobName, job] of Object.entries(getJobs(wf.doc))) {
				const jobPerm = job.permissions;
				if (typeof jobPerm === "string" && forbidden.includes(jobPerm)) {
					results.push({
						rule: "actions.permissions",
						path: wf.file,
						message: `禁止された permissions スカラー: ${jobPerm} (job: ${jobName})`,
						severity: rule.severity ?? "error",
					});
				}
			}
		}
	}

	return results;
}
