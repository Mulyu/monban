import type { GithubActionsDangerRule, RuleResult } from "../../types.js";
import { getJobs, loadWorkflows } from "./workflow.js";

interface RawWorkflow {
	on?: unknown;
}

const PR_TARGET_TRIGGERS = new Set(["pull_request_target"]);

export async function checkGithubActionsDanger(
	rules: GithubActionsDangerRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const severity = rule.severity ?? "error";
		const workflows = await loadWorkflows(rule.path, cwd, globalExclude);

		for (const wf of workflows) {
			const triggers = collectTriggers(wf.doc as RawWorkflow);
			const usesPullRequestTarget = triggers.some((t) =>
				PR_TARGET_TRIGGERS.has(t),
			);

			const jobs = getJobs(wf.doc);
			for (const [jobName, job] of Object.entries(jobs)) {
				const steps = job.steps;
				if (!Array.isArray(steps)) continue;

				for (const step of steps) {
					if (!step || typeof step !== "object") continue;
					const rec = step as Record<string, unknown>;
					const uses = rec.uses;
					if (typeof uses !== "string") continue;
					if (!uses.startsWith("actions/checkout@")) continue;

					if (usesPullRequestTarget) {
						results.push({
							rule: "actions.danger",
							path: `${wf.file}:${jobName}`,
							message: `pull_request_target + actions/checkout の組み合わせは危険 (フォーク PR から secret が窃取される経路)。`,
							severity,
						});
					}

					const withRec = rec.with;
					const persist = isWithObject(withRec)
						? withRec["persist-credentials"]
						: undefined;
					if (persist !== false) {
						results.push({
							rule: "actions.danger",
							path: `${wf.file}:${jobName}`,
							message: `actions/checkout は persist-credentials: false を明示してください (デフォルトでトークンが残留)。`,
							severity,
						});
					}
				}
			}
		}
	}

	return results;
}

function collectTriggers(doc: RawWorkflow): string[] {
	const on = doc.on;
	if (!on) return [];
	if (typeof on === "string") return [on];
	if (Array.isArray(on)) {
		return on.filter((v): v is string => typeof v === "string");
	}
	if (typeof on === "object") {
		return Object.keys(on as Record<string, unknown>);
	}
	return [];
}

function isWithObject(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null;
}
