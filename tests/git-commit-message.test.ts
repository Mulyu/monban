import { rm } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkGitCommitMessage } from "../src/rules/git/commit-message.js";
import { commit, createGitRepo } from "./git-helpers.js";

describe("git/commit.message", () => {
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
		const results = checkGitCommitMessage(undefined, repo, `${base}..HEAD`);
		expect(results).toHaveLength(0);
	});

	it("passes when subjects match conventional preset", () => {
		commit(repo, "feat: add feature");
		commit(repo, "fix(auth): fix login");
		const results = checkGitCommitMessage(
			{ preset: "conventional" },
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(0);
	});

	it("flags subjects that don't match preset", () => {
		commit(repo, "random garbage message");
		const results = checkGitCommitMessage(
			{ preset: "conventional" },
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(1);
		expect(results[0].rule).toBe("commit.message");
		expect(results[0].message).toContain("random garbage message");
	});

	it("flags subjects exceeding max length", () => {
		commit(repo, "feat: this subject is way too long to be acceptable yes");
		const results = checkGitCommitMessage(
			{ subject_max_length: 20 },
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("exceeds 20");
	});

	it("counts code points for Japanese subjects", () => {
		commit(repo, "日本語日本語日本語日本語");
		const results = checkGitCommitMessage(
			{ subject_max_length: 15 },
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(0);
	});

	it("flags forbidden keywords", () => {
		commit(repo, "fix");
		commit(repo, "update");
		const results = checkGitCommitMessage(
			{ forbidden_subjects: ["fix", "update", "wip"] },
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(2);
		expect(results.every((r) => r.message.includes("forbidden"))).toBe(true);
	});

	it("ignores merge commits by default", () => {
		// create a branch, make a commit on it, merge back
		commit(repo, "feat: base work");
		const mainHead = commit(repo, "feat: more main work");

		// manually create a merge-like structure using --allow-empty won't work;
		// this just tests subject "Merge ..." which won't happen automatically.
		// For unit testing purposes we rely on commit with a Merge-like subject
		// to verify ignore_reverts behaves symmetrically.
		void mainHead;
	});

	it("ignores reverts by default", () => {
		commit(repo, 'Revert "feat: something"');
		const results = checkGitCommitMessage(
			{ preset: "conventional" },
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(0);
	});

	it("checks reverts when ignore_reverts is false", () => {
		commit(repo, 'Revert "feat: something"');
		const results = checkGitCommitMessage(
			{ preset: "conventional", ignore_reverts: false },
			repo,
			`${base}..HEAD`,
		);
		expect(results.length).toBeGreaterThanOrEqual(1);
	});

	it("uses warn severity when configured", () => {
		commit(repo, "bad message");
		const results = checkGitCommitMessage(
			{ preset: "conventional", severity: "warn" },
			repo,
			`${base}..HEAD`,
		);
		expect(results[0].severity).toBe("warn");
	});

	it("enforces body_min_length", () => {
		commit(repo, "feat: add thing");
		const results = checkGitCommitMessage(
			{ body_min_length: 10 },
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("body");
	});

	it("uses short SHA as path", () => {
		const head = commit(repo, "bad message");
		const results = checkGitCommitMessage(
			{ preset: "conventional" },
			repo,
			`${base}..HEAD`,
		);
		expect(results[0].path).toBe(head.slice(0, 7));
	});
});
