import type { GithubRunnerRule, RuleResult } from "../../types.js";
import { getJobs, loadWorkflows } from "./workflow.js";

function extractRunners(runsOn: unknown): string[] {
	if (typeof runsOn === "string") return [runsOn];
	if (Array.isArray(runsOn)) {
		return runsOn.filter((x): x is string => typeof x === "string");
	}
	return [];
}

export async function checkGithubRunner(
	rules: GithubRunnerRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const workflows = await loadWorkflows(rule.path, cwd, globalExclude);

		for (const wf of workflows) {
			for (const [jobName, job] of Object.entries(getJobs(wf.doc))) {
				const runsOn = job["runs-on"];
				const runners = extractRunners(runsOn);
				for (const r of runners) {
					if (r.includes("${{")) continue;
					if (!rule.allowed.includes(r)) {
						results.push({
							rule: "actions.runner",
							path: wf.file,
							message: `許可されていないランナー: ${r} (job: ${jobName})`,
							severity: "error",
							fail_text: rule.fail_text,
							docs_url: rule.docs_url,
						});
					}
				}
			}
		}
	}

	return results;
}
