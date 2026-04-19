import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import fg from "../../ports/glob.js";
import type { AgentInstructionsRule, RuleResult } from "../../types.js";

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

export async function checkAgentInstructions(
	rules: AgentInstructionsRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const severity = rule.severity ?? "warn";
		const files = await fg(rule.path, {
			cwd,
			dot: true,
			onlyFiles: true,
			ignore: [...globalExclude, ...(rule.exclude ?? [])],
		});

		if (files.length === 0) {
			results.push({
				rule: "instructions",
				path: rule.path,
				message:
					rule.message ?? `エージェント指示書が見つかりません: ${rule.path}`,
				severity,
			});
			continue;
		}

		for (const file of files) {
			const abs = join(cwd, file);
			const content = await readFile(abs, "utf-8");

			if (rule.max_bytes !== undefined) {
				const info = await stat(abs);
				if (info.size > rule.max_bytes) {
					results.push({
						rule: "instructions",
						path: file,
						message:
							rule.message ??
							`サイズ ${info.size} B が上限 ${rule.max_bytes} B を超えています (大きすぎるとエージェントに無視されます)。`,
						severity,
					});
				}
			}

			if (rule.required_sections && rule.required_sections.length > 0) {
				const headings = extractH2(content);
				for (const required of rule.required_sections) {
					if (!headings.has(normalize(required))) {
						results.push({
							rule: "instructions",
							path: file,
							message:
								rule.message ??
								`必須セクションが見つかりません: ## ${required}`,
							severity,
						});
					}
				}
			}

			if (rule.frontmatter_keys && rule.frontmatter_keys.length > 0) {
				const frontmatter = extractFrontmatter(content);
				if (frontmatter !== null) {
					const allowed = new Set(rule.frontmatter_keys);
					for (const key of Object.keys(frontmatter)) {
						if (!allowed.has(key)) {
							results.push({
								rule: "instructions",
								path: file,
								message:
									rule.message ??
									`frontmatter に未許可のキー: ${key} (許可: ${rule.frontmatter_keys.join(", ")})`,
								severity,
							});
						}
					}
				}
			}
		}
	}

	return results;
}

function extractH2(content: string): Set<string> {
	const set = new Set<string>();
	for (const line of content.split("\n")) {
		const m = line.match(/^##\s+(.+?)\s*$/);
		if (m) set.add(normalize(m[1]));
	}
	return set;
}

function normalize(s: string): string {
	return s.trim().toLowerCase();
}

function extractFrontmatter(content: string): Record<string, unknown> | null {
	const m = content.match(FRONTMATTER_RE);
	if (!m) return null;
	try {
		const doc = parseYaml(m[1]);
		if (doc && typeof doc === "object" && !Array.isArray(doc)) {
			return doc as Record<string, unknown>;
		}
	} catch {
		// invalid YAML in frontmatter — silent
	}
	return null;
}
