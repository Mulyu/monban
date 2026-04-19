import { parse as parsePath } from "node:path";
import fg from "../../ports/glob.js";
import type { NamingRule, NamingStyle, RuleResult } from "../../types.js";

const STYLE_VALIDATORS: Record<NamingStyle, (name: string) => boolean> = {
	pascal: (name) => /^[A-Z][a-zA-Z0-9]*$/.test(name),
	camel: (name) => /^[a-z][a-zA-Z0-9]*$/.test(name),
	kebab: (name) => /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name),
	snake: (name) => /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(name),
};

export async function checkPathNaming(
	rules: NamingRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const target = rule.target ?? "file";

		const entries = await fg(rule.path, {
			cwd,
			dot: false,
			onlyFiles: target === "file",
			onlyDirectories: target === "directory",
			ignore: globalExclude,
		});

		for (const entry of entries) {
			const parsed = parsePath(entry);
			const rawName = target === "file" ? parsed.name : parsed.base;

			const violations = validateName(rawName, rule, entry);
			results.push(...violations);
		}
	}

	return results;
}

function validateName(
	rawName: string,
	rule: NamingRule,
	entryPath: string,
): RuleResult[] {
	const results: RuleResult[] = [];

	if (rule.prefix && !rawName.startsWith(rule.prefix)) {
		results.push({
			rule: "naming",
			path: entryPath,
			message: `prefix "${rule.prefix}" が期待されています。\n  現在: ${parsePath(entryPath).base}`,
			severity: "error",
		});
		return results;
	}

	if (rule.suffix && !rawName.endsWith(rule.suffix)) {
		results.push({
			rule: "naming",
			path: entryPath,
			message: `suffix "${rule.suffix}" が期待されています。\n  現在: ${parsePath(entryPath).base}`,
			severity: "error",
		});
		return results;
	}

	// Suffix is a separator (e.g. ".entity") — strip before style check.
	// Prefix blends into the name (e.g. "use" in "useAuth") — keep for style check.
	let nameForStyleCheck = rawName;
	if (rule.suffix) {
		nameForStyleCheck = nameForStyleCheck.slice(0, -rule.suffix.length);
	}

	if (nameForStyleCheck.length === 0) {
		return results;
	}

	const validator = STYLE_VALIDATORS[rule.style];
	if (!validator(nameForStyleCheck)) {
		results.push({
			rule: "naming",
			path: entryPath,
			message: `${rule.style} が期待されています。\n  現在: ${parsePath(entryPath).base}`,
			severity: "error",
		});
	}

	return results;
}
