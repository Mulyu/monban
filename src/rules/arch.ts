import fg from "fast-glob";
import type { ArchConfig, RuleResult } from "../types.js";

export async function checkArch(
	config: ArchConfig,
	cwd: string,
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of config.rules) {
		if (rule.must_not_contain) {
			const violations = await checkMustNotContain(
				cwd,
				rule.path,
				rule.must_not_contain,
			);
			results.push(...violations);
		}

		if (rule.required_files) {
			const violations = await checkRequiredFiles(
				cwd,
				rule.path,
				rule.required_files,
			);
			results.push(...violations);
		}
	}

	return results;
}

async function checkMustNotContain(
	cwd: string,
	pathPattern: string,
	forbidden: string,
): Promise<RuleResult[]> {
	const pattern = `${pathPattern}/**/*${forbidden}*`;
	const matches = await fg(pattern, { cwd, dot: false, onlyFiles: false });

	return matches.map((match) => ({
		rule: "arch/must_not_contain",
		path: match,
		message: `"${match}" matches forbidden pattern "${forbidden}" under "${pathPattern}"`,
		severity: "error" as const,
	}));
}

async function checkRequiredFiles(
	cwd: string,
	pathPattern: string,
	requiredFiles: string[],
): Promise<RuleResult[]> {
	const dirs = await fg(pathPattern, {
		cwd,
		onlyDirectories: true,
		dot: false,
	});

	const results: RuleResult[] = [];

	for (const dir of dirs) {
		for (const file of requiredFiles) {
			const fullPattern = `${dir}/${file}`;
			const found = await fg(fullPattern, { cwd });
			if (found.length === 0) {
				results.push({
					rule: "arch/required_files",
					path: `${dir}/${file}`,
					message: `Required file "${file}" is missing in "${dir}"`,
					severity: "error" as const,
				});
			}
		}
	}

	return results;
}
