import { rm } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkGitDiffSize } from "../src/rules/git/diff-size.js";
import { commit, createGitRepo, writeAndAdd } from "./git-helpers.js";

describe("git/diff.size", () => {
	let repo: string;
	let base: string;

	beforeEach(async () => {
		repo = await createGitRepo();
		await writeAndAdd(repo, "README.md", "base\n");
		base = commit(repo, "init");
	});

	afterEach(async () => {
		await rm(repo, { recursive: true });
	});

	it("returns empty when rule is undefined", async () => {
		const results = checkGitDiffSize(undefined, repo, `${base}...HEAD`);
		expect(results).toHaveLength(0);
	});

	it("passes when below all thresholds", async () => {
		await writeAndAdd(repo, "a.ts", "line1\nline2\n");
		commit(repo, "feat: add a");
		const results = checkGitDiffSize(
			{ max_files: 10, max_total_lines: 100 },
			repo,
			`${base}...HEAD`,
		);
		expect(results).toHaveLength(0);
	});

	it("flags too many files", async () => {
		for (let i = 0; i < 5; i++) {
			await writeAndAdd(repo, `f${i}.ts`, "x\n");
		}
		commit(repo, "feat: many files");
		const results = checkGitDiffSize({ max_files: 3 }, repo, `${base}...HEAD`);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("5");
		expect(results[0].message).toContain("3");
	});

	it("flags too many insertions", async () => {
		const content = "x\n".repeat(100);
		await writeAndAdd(repo, "big.ts", content);
		commit(repo, "feat: big");
		const results = checkGitDiffSize(
			{ max_insertions: 50 },
			repo,
			`${base}...HEAD`,
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("insertions");
	});

	it("flags total lines (insertions + deletions)", async () => {
		const content = "x\n".repeat(100);
		await writeAndAdd(repo, "big.ts", content);
		commit(repo, "feat: big");
		const results = checkGitDiffSize(
			{ max_total_lines: 50 },
			repo,
			`${base}...HEAD`,
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("total lines");
	});

	it("excludes lockfiles", async () => {
		const content = "x\n".repeat(100);
		await writeAndAdd(repo, "package-lock.json", content);
		commit(repo, "chore: bump deps");
		const results = checkGitDiffSize(
			{ max_total_lines: 50, exclude: ["**/package-lock.json"] },
			repo,
			`${base}...HEAD`,
		);
		expect(results).toHaveLength(0);
	});

	it("uses warn severity by default", async () => {
		const content = "x\n".repeat(100);
		await writeAndAdd(repo, "big.ts", content);
		commit(repo, "feat: big");
		const results = checkGitDiffSize(
			{ max_total_lines: 50 },
			repo,
			`${base}...HEAD`,
		);
		expect(results[0].severity).toBe("warn");
	});

	it("uses error severity when configured", async () => {
		const content = "x\n".repeat(100);
		await writeAndAdd(repo, "big.ts", content);
		commit(repo, "feat: big");
		const results = checkGitDiffSize(
			{ max_total_lines: 50, severity: "error" },
			repo,
			`${base}...HEAD`,
		);
		expect(results[0].severity).toBe("error");
	});
});
