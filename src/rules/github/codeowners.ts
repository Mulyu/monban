import { readFile } from "node:fs/promises";
import { join } from "node:path";
import picomatch from "picomatch";
import fg from "../../ports/glob.js";
import type { GithubCodeownersRule, RuleResult } from "../../types.js";

interface CodeownersEntry {
	pattern: string;
	owners: string[];
	match: (file: string) => boolean;
}

const CODEOWNERS_LOCATIONS = [
	".github/CODEOWNERS",
	"CODEOWNERS",
	"docs/CODEOWNERS",
];

async function readCodeowners(cwd: string): Promise<string | null> {
	for (const loc of CODEOWNERS_LOCATIONS) {
		try {
			return await readFile(join(cwd, loc), "utf-8");
		} catch {
			// try next
		}
	}
	return null;
}

function patternToGlob(pattern: string): string {
	const anchored = pattern.startsWith("/");
	let pat = anchored ? pattern.slice(1) : pattern;
	if (pat.endsWith("/")) pat = `${pat}**`;
	if (!anchored) pat = `**/${pat}`;
	return pat;
}

function parseCodeowners(content: string): CodeownersEntry[] {
	const entries: CodeownersEntry[] = [];
	for (const rawLine of content.split(/\r?\n/)) {
		const line = rawLine.replace(/#.*$/, "").trim();
		if (!line) continue;
		const tokens = line.split(/\s+/);
		const pattern = tokens[0];
		const owners = tokens.slice(1);
		const glob = patternToGlob(pattern);
		const matcher = picomatch(glob, { dot: true });
		entries.push({
			pattern,
			owners,
			match: (file) => matcher(file),
		});
	}
	return entries;
}

function lastMatching(
	entries: CodeownersEntry[],
	file: string,
): CodeownersEntry | null {
	let result: CodeownersEntry | null = null;
	for (const entry of entries) {
		if (entry.match(file)) result = entry;
	}
	return result;
}

export async function checkGithubCodeowners(
	rules: GithubCodeownersRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];
	if (rules.length === 0) return results;

	const content = await readCodeowners(cwd);
	if (content === null) {
		for (const rule of rules) {
			results.push({
				rule: "codeowners.ownership",
				path: rule.path,
				message:
					"CODEOWNERS が見つかりません (.github/CODEOWNERS / CODEOWNERS / docs/CODEOWNERS)",
				severity: "error",
			});
		}
		return results;
	}

	const entries = parseCodeowners(content);

	for (const rule of rules) {
		const files = await fg(rule.path, {
			cwd,
			dot: true,
			onlyFiles: true,
			ignore: globalExclude,
		});

		for (const file of files) {
			const entry = lastMatching(entries, file);
			if (!entry || entry.owners.length === 0) {
				results.push({
					rule: "codeowners.ownership",
					path: file,
					message:
						rule.message ??
						`CODEOWNERS で owner が割り当てられていません。期待: ${rule.owners.join(", ")}`,
					severity: "error",
				});
				continue;
			}
			const missing = rule.owners.filter((o) => !entry.owners.includes(o));
			if (missing.length > 0) {
				results.push({
					rule: "codeowners.ownership",
					path: file,
					message:
						rule.message ??
						`CODEOWNERS の owner が不足しています。不足: ${missing.join(", ")} (該当パターン: ${entry.pattern})`,
					severity: "error",
				});
			}
		}
	}

	return results;
}
