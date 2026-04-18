import type { GithubConsistencyRule, RuleResult } from "../../types.js";
import { extractAllUses, loadWorkflows } from "./workflow.js";

function parseUses(uses: string): { name: string; ref: string } | null {
	const atIndex = uses.lastIndexOf("@");
	if (atIndex === -1) return null;
	return { name: uses.slice(0, atIndex), ref: uses.slice(atIndex + 1) };
}

export async function checkGithubConsistency(
	rules: GithubConsistencyRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const workflows = await loadWorkflows(rule.path, cwd, globalExclude);

		// action name -> Map<ref, Set<file>>
		const byAction = new Map<string, Map<string, Set<string>>>();
		for (const target of rule.actions) {
			byAction.set(target, new Map());
		}

		for (const wf of workflows) {
			for (const entry of extractAllUses(wf.doc)) {
				if (entry.uses.startsWith("./") || entry.uses.startsWith("docker://")) {
					continue;
				}
				const parsed = parseUses(entry.uses);
				if (!parsed) continue;
				for (const target of rule.actions) {
					if (parsed.name === target || parsed.name.startsWith(`${target}/`)) {
						const refs = byAction.get(target);
						if (!refs) continue;
						let files = refs.get(parsed.ref);
						if (!files) {
							files = new Set();
							refs.set(parsed.ref, files);
						}
						files.add(wf.file);
					}
				}
			}
		}

		for (const [action, refs] of byAction) {
			if (refs.size <= 1) continue;
			const refList = [...refs.keys()].map((r) => `@${r}`).join(", ");
			const affectedFiles = new Set<string>();
			for (const files of refs.values()) {
				for (const f of files) affectedFiles.add(f);
			}
			for (const file of affectedFiles) {
				results.push({
					rule: "actions.consistency",
					path: file,
					message: `${action} のバージョンが一貫していません: ${refList}`,
					severity: "error",
				});
			}
		}
	}

	return results;
}
