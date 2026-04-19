import type { GithubTriggersRule, RuleResult } from "../../types.js";
import { loadWorkflows } from "./workflow.js";

function extractEvents(on: unknown): string[] {
	if (typeof on === "string") return [on];
	if (Array.isArray(on)) {
		return on.filter((x): x is string => typeof x === "string");
	}
	if (on && typeof on === "object") {
		return Object.keys(on as Record<string, unknown>);
	}
	return [];
}

export async function checkGithubTriggers(
	rules: GithubTriggersRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const workflows = await loadWorkflows(rule.path, cwd, globalExclude);

		for (const wf of workflows) {
			if (!wf.doc || typeof wf.doc !== "object") continue;
			const root = wf.doc as Record<string, unknown>;
			// yaml parser may map `on` to the boolean key true
			const onValue = root.on !== undefined ? root.on : root.true;
			const events = extractEvents(onValue);

			if (rule.allowed) {
				for (const event of events) {
					if (!rule.allowed.includes(event)) {
						results.push({
							rule: "actions.triggers",
							path: wf.file,
							message: `許可されていないトリガー: ${event}`,
							severity: "error",
							fail_text: rule.fail_text,
							docs_url: rule.docs_url,
						});
					}
				}
			}

			if (rule.forbidden) {
				for (const event of events) {
					if (rule.forbidden.includes(event)) {
						results.push({
							rule: "actions.triggers",
							path: wf.file,
							message: `禁止されたトリガー: ${event}`,
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
