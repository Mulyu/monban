import type { GithubSecretsRule, RuleResult } from "../../types.js";
import { loadWorkflows } from "./internal/workflow.js";

const SECRET_REF = /\$\{\{\s*secrets\.([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

export async function checkGithubSecrets(
	rules: GithubSecretsRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const allowedLower = rule.allowed
			? new Set(rule.allowed.map((n) => n.toLowerCase()))
			: null;
		const forbiddenLower = rule.forbidden
			? new Set(rule.forbidden.map((n) => n.toLowerCase()))
			: null;
		const workflows = await loadWorkflows(rule.path, cwd, globalExclude);

		for (const wf of workflows) {
			const seen = new Set<string>();
			SECRET_REF.lastIndex = 0;
			let match: RegExpExecArray | null;
			// biome-ignore lint/suspicious/noAssignInExpressions: standard regex loop
			while ((match = SECRET_REF.exec(wf.content)) !== null) {
				const name = match[1];
				if (seen.has(name)) continue;
				seen.add(name);
				const lower = name.toLowerCase();
				if (forbiddenLower?.has(lower)) {
					results.push({
						rule: "actions.secrets",
						path: wf.file,
						message: `禁止されたシークレット参照: ${name}`,
						severity: "error",
					});
					continue;
				}
				if (allowedLower && !allowedLower.has(lower)) {
					results.push({
						rule: "actions.secrets",
						path: wf.file,
						message: `許可されていないシークレット参照: ${name}`,
						severity: "error",
					});
				}
			}
		}
	}

	return results;
}
