import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { checkGitTagName } from "../src/rules/git/tag-name.js";
import { commit, createGitRepo, git, writeAndAdd } from "./git-helpers.js";

function tagAt(cwd: string, name: string, message: string, date: string): void {
	execFileSync("git", ["tag", "-a", name, "-m", message], {
		cwd,
		stdio: ["ignore", "pipe", "pipe"],
		env: {
			...process.env,
			GIT_COMMITTER_DATE: date,
			GIT_AUTHOR_DATE: date,
			GIT_COMMITTER_NAME: "Test",
			GIT_AUTHOR_NAME: "Test",
			GIT_COMMITTER_EMAIL: "test@example.com",
			GIT_AUTHOR_EMAIL: "test@example.com",
		},
	});
}

describe("git/tag_name", () => {
	it("returns no violation when no tags exist", async () => {
		const repo = await createGitRepo();
		await writeAndAdd(repo, "README.md", "init\n");
		commit(repo, "init");
		const results = checkGitTagName({ pattern: "^v\\d+\\.\\d+\\.\\d+$" }, repo);
		expect(results).toHaveLength(0);
	});

	it("flags tags that do not match SemVer", async () => {
		const repo = await createGitRepo();
		await writeAndAdd(repo, "README.md", "init\n");
		commit(repo, "init");
		git(repo, ["tag", "v1.0.0"]);
		git(repo, ["tag", "release-2"]);
		git(repo, ["tag", "v2.0.0"]);

		const results = checkGitTagName({ pattern: "^v\\d+\\.\\d+\\.\\d+$" }, repo);
		expect(results).toHaveLength(1);
		expect(results[0].path).toBe("release-2");
		expect(results[0].rule).toBe("tag_name");
	});

	it("respects scope: recent + limit (annotated tags)", async () => {
		const repo = await createGitRepo();
		await writeAndAdd(repo, "README.md", "init\n");
		commit(repo, "init");

		// Annotated tags with distinct creator dates.
		tagAt(repo, "old-bad", "old", "2025-01-01T00:00:00");
		tagAt(repo, "v1.0.0", "release 1", "2025-06-01T00:00:00");
		tagAt(repo, "v2.0.0", "release 2", "2026-01-01T00:00:00");

		const results = checkGitTagName(
			{ pattern: "^v\\d+\\.\\d+\\.\\d+$", scope: "recent", limit: 2 },
			repo,
		);
		// only the 2 most-recent tags considered → both pass
		expect(results).toHaveLength(0);
	});

	it("uses custom message and severity", async () => {
		const repo = await createGitRepo();
		await writeAndAdd(repo, "README.md", "init\n");
		commit(repo, "init");
		git(repo, ["tag", "bad"]);

		const results = checkGitTagName(
			{
				pattern: "^v\\d+\\.\\d+\\.\\d+$",
				message: "SemVer 形式で。",
				severity: "warn",
			},
			repo,
		);
		expect(results[0].message).toBe("SemVer 形式で。");
		expect(results[0].severity).toBe("warn");
	});
});
