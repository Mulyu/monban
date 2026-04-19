import type { GithubActionsInjectionRule, RuleResult } from "../../types.js";
import { getJobs, loadWorkflows } from "./workflow.js";

// Untrusted input contexts most often abused in script injection attacks.
// Reference: GitHub security hardening guide, OWASP CI/CD Top 10.
const DANGEROUS_CONTEXTS = [
	"github.event.issue.title",
	"github.event.issue.body",
	"github.event.pull_request.title",
	"github.event.pull_request.body",
	"github.event.pull_request.head.ref",
	"github.event.pull_request.head.label",
	"github.event.comment.body",
	"github.event.review.body",
	"github.event.review_comment.body",
	"github.event.discussion.title",
	"github.event.discussion.body",
	"github.event.commits.*.message",
	"github.event.commits.*.author.email",
	"github.event.commits.*.author.name",
	"github.head_ref",
];

// `${{ ... }}` capture
const EXPRESSION = /\$\{\{\s*([^}]+?)\s*\}\}/g;

export async function checkGithubActionsInjection(
	rules: GithubActionsInjectionRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const severity = rule.severity ?? "error";
		const allow = new Set(rule.allow_contexts ?? []);
		const workflows = await loadWorkflows(rule.path, cwd, globalExclude);

		for (const wf of workflows) {
			const jobs = getJobs(wf.doc);
			for (const [jobName, job] of Object.entries(jobs)) {
				const steps = job.steps;
				if (!Array.isArray(steps)) continue;

				for (const step of steps) {
					if (!step || typeof step !== "object") continue;
					const run = (step as Record<string, unknown>).run;
					if (typeof run !== "string") continue;

					for (const m of run.matchAll(EXPRESSION)) {
						const expr = m[1].trim();
						if (allow.has(expr)) continue;
						const matched = matchDangerous(expr);
						if (!matched) continue;
						results.push({
							rule: "actions.injection",
							path: `${wf.file}:${jobName}`,
							message: `信頼できない入力 ${matched} が run: ステップ内で使われています (script injection の経路)。env: 経由で受け渡してください。`,
							severity,
						});
					}
				}
			}
		}
	}

	return results;
}

function matchDangerous(expr: string): string | null {
	for (const ctx of DANGEROUS_CONTEXTS) {
		if (ctxMatches(expr, ctx)) return ctx;
	}
	return null;
}

function ctxMatches(expr: string, pattern: string): boolean {
	if (!pattern.includes("*")) return expr === pattern;
	// Translate `commits.*.message` → `commits\.[^.]+\.message`
	const re = new RegExp(
		`^${pattern
			.split(".")
			.map((seg) => (seg === "*" ? "[^.]+" : escapeRegex(seg)))
			.join("\\.")}$`,
	);
	return re.test(expr);
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
