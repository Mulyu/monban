import { rm } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	applyDiffFilter,
	computeDiffScope,
	resolveDiffBase,
} from "../src/diff.js";
import type { DiffScope, RuleResult } from "../src/types.js";
import { commit, createGitRepo, git, writeAndAdd } from "./git-helpers.js";

function makeScope(
	files: string[],
	lines: Record<string, number[]> = {},
	granularity: "file" | "line" = "file",
): DiffScope {
	return {
		files: new Set(files),
		addedLines: new Map(Object.entries(lines).map(([k, v]) => [k, new Set(v)])),
		granularity,
	};
}

const error: "error" = "error";

describe("applyDiffFilter", () => {
	it("returns original results when scope is null", () => {
		const results: RuleResult[] = [
			{ rule: "r", path: "a.ts", message: "m", severity: error },
		];
		expect(applyDiffFilter(results, null)).toEqual(results);
	});

	it("keeps violations whose file is in the diff set (file granularity)", () => {
		const scope = makeScope(["src/a.ts", "src/b.ts"]);
		const results: RuleResult[] = [
			{ rule: "r", path: "src/a.ts", message: "m", severity: error },
			{ rule: "r", path: "src/c.ts", message: "m", severity: error },
			{ rule: "r", path: "src/b.ts:12", message: "m", severity: error },
		];
		const filtered = applyDiffFilter(results, scope);
		expect(filtered.map((r) => r.path)).toEqual(["src/a.ts", "src/b.ts:12"]);
	});

	it("filters by added lines when granularity is line", () => {
		const scope = makeScope(["src/a.ts"], { "src/a.ts": [5, 6, 7] }, "line");
		const results: RuleResult[] = [
			{ rule: "r", path: "src/a.ts:3", message: "m", severity: error },
			{ rule: "r", path: "src/a.ts:5", message: "m", severity: error },
			{ rule: "r", path: "src/a.ts:8", message: "m", severity: error },
			{ rule: "r", path: "src/a.ts", message: "m", severity: error },
		];
		const filtered = applyDiffFilter(results, scope);
		expect(filtered.map((r) => r.path)).toEqual(["src/a.ts:5", "src/a.ts"]);
	});

	it("treats paths without :<digit> suffix as file-level results", () => {
		const scope = makeScope(["src/a.ts"], { "src/a.ts": [1] }, "line");
		const results: RuleResult[] = [
			{ rule: "r", path: "src/a.ts", message: "m", severity: error },
		];
		expect(applyDiffFilter(results, scope)).toHaveLength(1);
	});
});

describe("resolveDiffBase", () => {
	let repo: string;

	beforeEach(async () => {
		repo = await createGitRepo();
		await writeAndAdd(repo, "README.md", "base\n");
		commit(repo, "init");
	});

	afterEach(async () => {
		await rm(repo, { recursive: true });
		delete process.env.GITHUB_BASE_REF;
	});

	it("returns the explicit base when provided", () => {
		expect(resolveDiffBase(repo, "HEAD")).toBe("HEAD");
	});

	it("uses GITHUB_BASE_REF when no explicit base is given", () => {
		process.env.GITHUB_BASE_REF = "feature-x";
		expect(resolveDiffBase(repo)).toBe("origin/feature-x");
	});

	it("falls back to main when available", () => {
		expect(resolveDiffBase(repo)).toBe("main");
	});

	it("returns null when no base can be resolved", async () => {
		const orphan = await createGitRepo();
		try {
			git(orphan, ["checkout", "-q", "-b", "other"]);
			expect(resolveDiffBase(orphan)).toBeNull();
		} finally {
			await rm(orphan, { recursive: true });
		}
	});
});

describe("computeDiffScope", () => {
	let repo: string;

	beforeEach(async () => {
		repo = await createGitRepo();
		await writeAndAdd(repo, "README.md", "base\n");
		commit(repo, "init");
	});

	afterEach(async () => {
		await rm(repo, { recursive: true });
	});

	it("collects files changed between base and HEAD", async () => {
		await writeAndAdd(repo, "src/a.ts", "a\n");
		commit(repo, "feat: a");
		const scope = computeDiffScope(repo, { base: "HEAD~1" });
		expect(scope).not.toBeNull();
		expect(scope?.files.has("src/a.ts")).toBe(true);
	});

	it("returns null when the base cannot be resolved", () => {
		expect(computeDiffScope(repo, { base: "nonexistent-ref" })).toBeNull();
	});

	it("includes staged and untracked files in addition to committed diff", async () => {
		await writeAndAdd(repo, "tracked.ts", "x\n");
		// staged only (not committed)
		// untracked file
		await writeAndAdd(repo, "staged.ts", "s\n");
		const { writeFile } = await import("node:fs/promises");
		const { join } = await import("node:path");
		await writeFile(join(repo, "untracked.ts"), "u\n");

		const scope = computeDiffScope(repo, { base: "HEAD" });
		expect(scope?.files.has("staged.ts")).toBe(true);
		expect(scope?.files.has("untracked.ts")).toBe(true);
	});

	it("collects added line numbers when granularity is line", async () => {
		await writeAndAdd(repo, "src/a.ts", "l1\nl2\nl3\n");
		commit(repo, "feat: a");
		const scope = computeDiffScope(repo, {
			base: "HEAD~1",
			granularity: "line",
		});
		expect(scope?.granularity).toBe("line");
		const added = scope?.addedLines.get("src/a.ts");
		expect(added).toBeDefined();
		expect(added?.has(1)).toBe(true);
		expect(added?.has(3)).toBe(true);
	});

	it("defaults granularity to file", async () => {
		await writeAndAdd(repo, "src/a.ts", "x\n");
		commit(repo, "feat");
		const scope = computeDiffScope(repo, { base: "HEAD~1" });
		expect(scope?.granularity).toBe("file");
		expect(scope?.addedLines.size).toBe(0);
	});
});
