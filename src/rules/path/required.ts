import { access } from "node:fs/promises";
import { join, parse as parsePath } from "node:path";
import fg from "fast-glob";
import type { RequiredRule, RuleResult } from "../../types.js";

export async function checkRequired(
	rules: RequiredRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		if (rule.files) {
			results.push(...(await checkFiles(rule, cwd, globalExclude)));
		}
		if (rule.companions) {
			results.push(...(await checkCompanions(rule, cwd, globalExclude)));
		}
	}

	return results;
}

async function checkFiles(
	rule: RequiredRule,
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];
	const dirs = await fg(rule.path, {
		cwd,
		onlyDirectories: true,
		dot: false,
		ignore: globalExclude,
	});

	const files = rule.files ?? [];
	for (const dir of dirs) {
		for (const file of files) {
			const isDir = file.endsWith("/");
			const target = join(cwd, dir, file);
			const exists = await fileExists(target);

			if (!exists) {
				const kind = isDir ? "ディレクトリ" : "ファイル";
				results.push({
					rule: "required",
					path: `${dir}/`,
					message: `必須${kind}が見つかりません: ${file}`,
					severity: "error",
				});
			}
		}
	}

	return results;
}

async function checkCompanions(
	rule: RequiredRule,
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];
	const files = await fg(rule.path, {
		cwd,
		onlyFiles: true,
		dot: false,
		ignore: [...globalExclude, ...(rule.exclude ?? [])],
	});

	for (const file of files) {
		const parsed = parsePath(file);
		const stem = parsed.name;
		const dir = parsed.dir;

		for (const companion of rule.companions ?? []) {
			const companionPath = companion.pattern.replace("{stem}", stem);
			const fullCompanionPath = join(dir, companionPath);
			const exists = await fileExists(join(cwd, fullCompanionPath));

			if (!exists) {
				results.push({
					rule: "required",
					path: file,
					message: `対応ファイルが見つかりません: ${companionPath}`,
					severity: companion.required ? "error" : "warn",
				});
			}
		}
	}

	return results;
}

async function fileExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}
