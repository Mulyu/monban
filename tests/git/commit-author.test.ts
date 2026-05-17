import { execFileSync } from "node:child_process";
import { rm } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkGitCommitAuthor } from "../../src/rules/git/commit-author.js";
import { commit, createGitRepo } from "./helpers.js";

function commitAs(cwd: string, email: string, message: string): void {
	execFileSync("git", ["commit", "-q", "--allow-empty", "-m", message], {
		cwd,
		encoding: "utf-8",
		env: {
			...process.env,
			GIT_COMMITTER_DATE: "2026-01-01T00:00:00",
			GIT_AUTHOR_DATE: "2026-01-01T00:00:00",
			GIT_COMMITTER_NAME: "Test",
			GIT_AUTHOR_NAME: "Test",
			GIT_COMMITTER_EMAIL: email,
			GIT_AUTHOR_EMAIL: email,
		},
	});
}

describe("git/commit.author", () => {
	let repo: string;
	let base: string;

	beforeEach(async () => {
		repo = await createGitRepo();
		base = commit(repo, "init: initial commit");
	});

	afterEach(async () => {
		await rm(repo, { recursive: true });
	});

	it("returns empty when rule is undefined", () => {
		const results = checkGitCommitAuthor(undefined, repo, `${base}..HEAD`);
		expect(results).toHaveLength(0);
	});

	it("returns empty when neither allowed nor forbidden is set", () => {
		const results = checkGitCommitAuthor({}, repo, `${base}..HEAD`);
		expect(results).toHaveLength(0);
	});

	it("flags commits whose author is not in allowlist", () => {
		commitAs(repo, "stranger@example.org", "feat: outside");
		const results = checkGitCommitAuthor(
			{ allowed: ["@example\\.com$"] },
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(1);
		expect(results[0].rule).toBe("commit.author");
		expect(results[0].message).toContain("stranger@example.org");
	});

	it("passes commits whose author matches allowlist", () => {
		commitAs(repo, "user@example.com", "feat: inside");
		const results = checkGitCommitAuthor(
			{ allowed: ["@example\\.com$"] },
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(0);
	});

	it("flags commits whose author matches forbidden", () => {
		commitAs(repo, "user@personal.test", "feat: personal");
		const results = checkGitCommitAuthor(
			{ forbidden: ["@personal\\.test$"] },
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("personal.test");
	});

	it("respects custom severity", () => {
		commitAs(repo, "stranger@example.org", "feat: outside");
		const results = checkGitCommitAuthor(
			{ allowed: ["@example\\.com$"], severity: "warn" },
			repo,
			`${base}..HEAD`,
		);
		expect(results[0].severity).toBe("warn");
	});
});
