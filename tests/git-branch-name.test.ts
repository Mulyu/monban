import { describe, expect, it } from "vitest";
import { checkGitBranchName } from "../src/rules/git/branch-name.js";
import { commit, createGitRepo, git, writeAndAdd } from "./git-helpers.js";

describe("git/branch_name", () => {
	it("returns no violation when branch matches the pattern", async () => {
		const repo = await createGitRepo();
		await writeAndAdd(repo, "README.md", "init\n");
		commit(repo, "init");
		git(repo, ["checkout", "-q", "-b", "feat/add-foo"]);

		const results = checkGitBranchName(
			{ pattern: "^(feat|fix|chore)/[a-z0-9-]+$" },
			repo,
		);
		expect(results).toHaveLength(0);
	});

	it("flags branch names that do not match", async () => {
		const repo = await createGitRepo();
		await writeAndAdd(repo, "README.md", "init\n");
		commit(repo, "init");
		git(repo, ["checkout", "-q", "-b", "WIP_branch"]);

		const results = checkGitBranchName(
			{ pattern: "^(feat|fix|chore)/[a-z0-9-]+$" },
			repo,
		);
		expect(results).toHaveLength(1);
		expect(results[0].rule).toBe("branch_name");
		expect(results[0].path).toBe("WIP_branch");
		expect(results[0].severity).toBe("error");
	});

	it("respects the allowed list", async () => {
		const repo = await createGitRepo();
		await writeAndAdd(repo, "README.md", "init\n");
		commit(repo, "init");

		const results = checkGitBranchName(
			{
				pattern: "^(feat|fix|chore)/[a-z0-9-]+$",
				allowed: ["main", "develop"],
			},
			repo,
		);
		expect(results).toHaveLength(0);
	});

	it("returns no violation in detached HEAD state", async () => {
		const repo = await createGitRepo();
		await writeAndAdd(repo, "README.md", "init\n");
		const sha = commit(repo, "init");
		git(repo, ["checkout", "-q", sha]);

		const results = checkGitBranchName({ pattern: "^feat/" }, repo);
		expect(results).toHaveLength(0);
	});

	it("uses custom message", async () => {
		const repo = await createGitRepo();
		await writeAndAdd(repo, "README.md", "init\n");
		commit(repo, "init");
		git(repo, ["checkout", "-q", "-b", "bad-name"]);

		const results = checkGitBranchName(
			{ pattern: "^feat/", message: "ブランチ名規約に従ってください。" },
			repo,
		);
		expect(results[0].message).toBe("ブランチ名規約に従ってください。");
	});

	it("uses custom severity", async () => {
		const repo = await createGitRepo();
		await writeAndAdd(repo, "README.md", "init\n");
		commit(repo, "init");
		git(repo, ["checkout", "-q", "-b", "bad-name"]);

		const results = checkGitBranchName(
			{ pattern: "^feat/", severity: "warn" },
			repo,
		);
		expect(results[0].severity).toBe("warn");
	});
});
