import { rm } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkGitCommitReferences } from "../src/rules/git/commit-references.js";
import { commit, createGitRepo } from "./git-helpers.js";

describe("git/commit.references", () => {
	let repo: string;
	let base: string;

	beforeEach(async () => {
		repo = await createGitRepo();
		base = commit(repo, "init");
	});

	afterEach(async () => {
		await rm(repo, { recursive: true });
	});

	it("returns empty when rule is undefined", () => {
		commit(repo, "feat: work");
		const results = checkGitCommitReferences(undefined, repo, `${base}..HEAD`);
		expect(results).toHaveLength(0);
	});

	it("returns empty when not required", () => {
		commit(repo, "feat: work");
		const results = checkGitCommitReferences(
			{ required: false, patterns: ["#\\d+"] },
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(0);
	});

	it("any scope passes when at least one commit references", () => {
		commit(repo, "feat: work");
		commit(repo, "feat: more work\n\nRefs #42");
		const results = checkGitCommitReferences(
			{ required: true, patterns: ["#\\d+"], scope: "any" },
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(0);
	});

	it("any scope flags when no commit references", () => {
		commit(repo, "feat: work");
		commit(repo, "feat: more work");
		const results = checkGitCommitReferences(
			{ required: true, patterns: ["#\\d+", "PROJ-\\d+"], scope: "any" },
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("#");
		expect(results[0].message).toContain("PROJ-");
	});

	it("all scope flags each commit without a reference", () => {
		commit(repo, "feat: with ref #1");
		const badSha = commit(repo, "feat: no ref here");
		const results = checkGitCommitReferences(
			{ required: true, patterns: ["#\\d+"], scope: "all" },
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(1);
		expect(results[0].path).toBe(badSha.slice(0, 7));
	});

	it("matches GitHub style #123", () => {
		commit(repo, "feat: work (#42)");
		const results = checkGitCommitReferences(
			{ required: true, patterns: ["#\\d+"], scope: "all" },
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(0);
	});

	it("matches Jira style PROJ-123", () => {
		commit(repo, "feat: PROJ-42 do work");
		const results = checkGitCommitReferences(
			{
				required: true,
				patterns: ["[A-Z]+-\\d+"],
				scope: "all",
			},
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(0);
	});

	it("ignore_patterns skips dependency updates", () => {
		commit(repo, "chore(deps): bump foo to 1.2.3");
		commit(repo, "feat: work #42");
		const results = checkGitCommitReferences(
			{
				required: true,
				patterns: ["#\\d+"],
				scope: "all",
				ignore_patterns: ["^chore\\(deps\\):"],
			},
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(0);
	});

	it("uses warn severity when configured", () => {
		commit(repo, "feat: no ref");
		const results = checkGitCommitReferences(
			{
				required: true,
				patterns: ["#\\d+"],
				scope: "any",
				severity: "warn",
			},
			repo,
			`${base}..HEAD`,
		);
		expect(results[0].severity).toBe("warn");
	});

	it("returns empty when required but patterns is empty", () => {
		commit(repo, "feat: work");
		const results = checkGitCommitReferences(
			{ required: true, patterns: [] },
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(0);
	});

	it("returns empty when no commits in range", () => {
		const results = checkGitCommitReferences(
			{ required: true, patterns: ["#\\d+"] },
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(0);
	});
});
