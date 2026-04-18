import type {
	GithubPinnedRule,
	GithubPinnedTarget,
	RuleResult,
} from "../../types.js";
import { extractAllUses, loadWorkflows } from "./workflow.js";

const COMMIT_HASH = /^[0-9a-f]{40}$/;
const DOCKER_SHA = /@sha256:[0-9a-f]{64}$/;

const DEFAULT_TARGETS: GithubPinnedTarget[] = ["action"];

export async function checkGithubPinned(
	rules: GithubPinnedRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const targets = new Set<GithubPinnedTarget>(
			rule.targets ?? DEFAULT_TARGETS,
		);
		const workflows = await loadWorkflows(rule.path, cwd, globalExclude);

		for (const wf of workflows) {
			for (const entry of extractAllUses(wf.doc)) {
				if (!targets.has(entry.kind)) continue;
				if (entry.uses.startsWith("./")) continue;

				if (entry.kind === "docker") {
					if (!DOCKER_SHA.test(entry.uses)) {
						results.push({
							rule: "pinned",
							path: wf.file,
							message: `ハッシュ固定されていません: ${entry.uses}`,
							severity: "error",
						});
					}
					continue;
				}

				const atIndex = entry.uses.lastIndexOf("@");
				if (atIndex === -1) {
					results.push({
						rule: "pinned",
						path: wf.file,
						message: `ハッシュ固定されていません: ${entry.uses}`,
						severity: "error",
					});
					continue;
				}
				const ref = entry.uses.slice(atIndex + 1);
				if (!COMMIT_HASH.test(ref)) {
					results.push({
						rule: "pinned",
						path: wf.file,
						message: `ハッシュ固定されていません: ${entry.uses}`,
						severity: "error",
					});
				}
			}
		}
	}

	return results;
}
