import { execFileSync } from "node:child_process";
import type { DiffGranularity, DiffScope, RuleResult } from "./types.js";

export interface DiffOptions {
	base?: string;
	granularity?: DiffGranularity;
}

export function computeDiffScope(
	cwd: string,
	options: DiffOptions,
): DiffScope | null {
	const base = resolveBase(cwd, options.base);
	if (!base) return null;

	let changed: string[];
	try {
		const out = runGit(cwd, ["diff", "--name-only", `${base}...HEAD`]);
		changed = out.split("\n").filter(Boolean);
	} catch {
		return null;
	}

	try {
		const unstaged = runGit(cwd, ["diff", "--name-only"]);
		for (const f of unstaged.split("\n").filter(Boolean)) changed.push(f);
		const staged = runGit(cwd, ["diff", "--name-only", "--staged"]);
		for (const f of staged.split("\n").filter(Boolean)) changed.push(f);
		const untracked = runGit(cwd, [
			"ls-files",
			"--others",
			"--exclude-standard",
		]);
		for (const f of untracked.split("\n").filter(Boolean)) changed.push(f);
	} catch {
		// ignore
	}

	const files = new Set(changed);
	const granularity: DiffGranularity = options.granularity ?? "file";
	const addedLines = new Map<string, Set<number>>();

	if (granularity === "line") {
		for (const file of files) {
			const set = collectAddedLines(cwd, base, file);
			if (set.size > 0) addedLines.set(file, set);
		}
	}

	return { files, addedLines, granularity };
}

function collectAddedLines(
	cwd: string,
	base: string,
	file: string,
): Set<number> {
	const set = new Set<number>();
	const trySources = [
		["diff", "--unified=0", `${base}...HEAD`, "--", file],
		["diff", "--unified=0", "--", file],
		["diff", "--unified=0", "--staged", "--", file],
	];
	for (const args of trySources) {
		let out: string;
		try {
			out = runGit(cwd, args);
		} catch {
			continue;
		}
		for (const line of out.split("\n")) {
			const m = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
			if (m) {
				const start = Number.parseInt(m[1], 10);
				const count = m[2] !== undefined ? Number.parseInt(m[2], 10) : 1;
				for (let i = 0; i < count; i++) set.add(start + i);
			}
		}
	}
	return set;
}

function resolveBase(cwd: string, base?: string): string | null {
	if (base && base.length > 0) {
		return base;
	}
	const env = process.env.GITHUB_BASE_REF;
	if (env) return `origin/${env}`;
	if (tryRef(cwd, "origin/main")) return "origin/main";
	if (tryRef(cwd, "main")) return "main";
	return null;
}

function tryRef(cwd: string, ref: string): boolean {
	try {
		runGit(cwd, ["rev-parse", "--verify", ref]);
		return true;
	} catch {
		return false;
	}
}

function runGit(cwd: string, args: string[]): string {
	return execFileSync("git", args, {
		cwd,
		encoding: "utf-8",
		stdio: ["ignore", "pipe", "pipe"],
	});
}

export function applyDiffFilter(
	results: RuleResult[],
	scope: DiffScope | null,
): RuleResult[] {
	if (!scope) return results;
	return results.filter((r) => inScope(r.path, scope));
}

function inScope(path: string, scope: DiffScope): boolean {
	const idx = path.lastIndexOf(":");
	let file = path;
	let line: number | undefined;
	if (idx !== -1) {
		const lineStr = path.slice(idx + 1);
		if (/^\d+$/.test(lineStr)) {
			file = path.slice(0, idx);
			line = Number.parseInt(lineStr, 10);
		}
	}

	if (!scope.files.has(file)) return false;
	if (scope.granularity === "line" && line !== undefined) {
		const lines = scope.addedLines.get(file);
		if (!lines) return false;
		return lines.has(line);
	}
	return true;
}
