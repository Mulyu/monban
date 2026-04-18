import { rm } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GIT_RULE_NAMES, runGitRules } from "../src/rules/git/index.js";
import { commit, createGitRepo, writeAndAdd } from "./git-helpers.js";

describe("git/runGitRules", () => {
	let repo: string;

	beforeEach(async () => {
		repo = await createGitRepo();
		await writeAndAdd(repo, ".gitignore", ".env*\n");
		await writeAndAdd(repo, "README.md", "base\n");
		commit(repo, "init: base");
	});

	afterEach(async () => {
		await rm(repo, { recursive: true });
	});

	it("exposes expected rule names", () => {
		expect(GIT_RULE_NAMES).toEqual([
			"commit.message",
			"commit.trailers",
			"commit.references",
			"diff.size",
			"diff.ignored",
		]);
	});

	it("runs all rules and collects violations", async () => {
		await writeAndAdd(repo, ".env.local", "SECRET=1\n");
		commit(repo, "bad subject here");
		const results = await runGitRules(
			{
				commit: {
					message: { preset: "conventional" },
					trailers: { deny: [{ key: "Co-authored-by" }] },
				},
				diff: {
					size: { max_total_lines: 1 },
					ignored: {},
				},
			},
			repo,
			undefined,
			{ diff: "HEAD~1" },
		);

		const ruleNames = results.map((r) => r.name).sort();
		expect(ruleNames).toEqual([
			"commit.message",
			"commit.references",
			"commit.trailers",
			"diff.ignored",
			"diff.size",
		]);

		const messageResult = results.find((r) => r.name === "commit.message");
		expect(messageResult?.results.length).toBeGreaterThan(0);
		const ignoredResult = results.find((r) => r.name === "diff.ignored");
		expect(ignoredResult?.results.map((v) => v.path)).toContain(".env.local");
	});

	it("supports --rule filter", async () => {
		commit(repo, "bad subject");
		const results = await runGitRules(
			{ commit: { message: { preset: "conventional" } } },
			repo,
			"commit.message",
			{ diff: "HEAD~1" },
		);
		expect(results).toHaveLength(1);
		expect(results[0].name).toBe("commit.message");
	});

	it("throws on unknown rule filter", async () => {
		await expect(
			runGitRules({}, repo, "nonexistent", { diff: "HEAD~1" }),
		).rejects.toThrow(/Unknown git rule/);
	});
});
