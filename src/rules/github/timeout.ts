import type { GithubTimeoutRule, RuleResult } from "../../types.js";
import { getJobs, loadWorkflows } from "./workflow.js";

export async function checkGithubTimeout(
	rules: GithubTimeoutRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const workflows = await loadWorkflows(rule.path, cwd, globalExclude);

		for (const wf of workflows) {
			for (const [jobName, job] of Object.entries(getJobs(wf.doc))) {
				// reusable workflow calls (job-level uses) cannot declare timeout-minutes
				if (typeof job.uses === "string") continue;

				const value = job["timeout-minutes"];
				if (value === undefined) {
					results.push({
						rule: "timeout",
						path: wf.file,
						message: `timeout-minutes が設定されていません (job: ${jobName})`,
						severity: "error",
					});
					continue;
				}
				if (typeof value !== "number" || !Number.isFinite(value)) {
					results.push({
						rule: "timeout",
						path: wf.file,
						message: `timeout-minutes が数値ではありません (job: ${jobName})`,
						severity: "error",
					});
					continue;
				}
				if (value > rule.max) {
					results.push({
						rule: "timeout",
						path: wf.file,
						message: `timeout-minutes が上限 ${rule.max} 分を超えています: ${value} (job: ${jobName})`,
						severity: "error",
					});
				}
			}
		}
	}

	return results;
}
