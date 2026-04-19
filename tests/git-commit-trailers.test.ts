import { rm } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkGitCommitTrailers } from "../src/rules/git/commit-trailers.js";
import { commit, createGitRepo } from "./git-helpers.js";

describe("git/commit.trailers", () => {
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
		const results = checkGitCommitTrailers(undefined, repo, `${base}..HEAD`);
		expect(results).toHaveLength(0);
	});

	it("passes when no forbidden / required rules match", () => {
		commit(
			repo,
			"feat: add\n\nbody here\n\nSigned-off-by: Alice <alice@example.com>",
		);
		const results = checkGitCommitTrailers(
			{ forbidden: [{ key: "Co-authored-by" }] },
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(0);
	});

	it("forbids trailer by key only", () => {
		commit(
			repo,
			"feat: add\n\nbody\n\nCo-authored-by: Claude <noreply@anthropic.com>",
		);
		const results = checkGitCommitTrailers(
			{ forbidden: [{ key: "Co-authored-by" }] },
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("Co-authored-by");
	});

	it("forbids trailer by value pattern", () => {
		commit(
			repo,
			"feat: add\n\nbody\n\nCo-authored-by: Alice <alice@example.com>",
		);
		commit(
			repo,
			"feat: more\n\nbody\n\nCo-authored-by: Claude <noreply@anthropic.com>",
		);
		const results = checkGitCommitTrailers(
			{
				forbidden: [
					{ key: "Co-authored-by", value_pattern: "(Claude|Copilot|Cursor)" },
				],
			},
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("Claude");
	});

	it("allowed overrides forbidden", () => {
		commit(
			repo,
			"feat: add\n\nbody\n\nCo-authored-by: Claude <noreply@anthropic.com>",
		);
		const results = checkGitCommitTrailers(
			{
				forbidden: [{ key: "Co-authored-by" }],
				allowed: [{ key: "Co-authored-by" }],
			},
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(0);
	});

	it("flags missing required trailer", () => {
		commit(repo, "feat: add\n\nbody");
		const results = checkGitCommitTrailers(
			{ required: [{ key: "Signed-off-by" }] },
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("Signed-off-by");
	});

	it("passes when required trailer is present", () => {
		commit(
			repo,
			"feat: add\n\nbody\n\nSigned-off-by: Alice <alice@example.com>",
		);
		const results = checkGitCommitTrailers(
			{ required: [{ key: "Signed-off-by" }] },
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(0);
	});

	it("normalizes trailer keys case-insensitively", () => {
		commit(repo, "feat: add\n\nbody\n\nco-authored-by: Claude <x@x.com>");
		const results = checkGitCommitTrailers(
			{ forbidden: [{ key: "Co-Authored-By" }] },
			repo,
			`${base}..HEAD`,
		);
		expect(results).toHaveLength(1);
	});

	it("includes custom forbidden message", () => {
		commit(repo, "feat: add\n\nbody\n\nCo-authored-by: Claude <x@x.com>");
		const results = checkGitCommitTrailers(
			{
				forbidden: [
					{ key: "Co-authored-by", message: "Policy X forbids this." },
				],
			},
			repo,
			`${base}..HEAD`,
		);
		expect(results[0].message).toContain("Policy X forbids this.");
	});
});
