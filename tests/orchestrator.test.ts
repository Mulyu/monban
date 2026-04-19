import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runAll, runCategory } from "../src/orchestrator.js";
import type { MonbanConfig } from "../src/types.js";
import { commit, createGitRepo, writeAndAdd } from "./git-helpers.js";

const contentCwd = resolve(import.meta.dirname, "fixtures/content");
const projectCwd = resolve(import.meta.dirname, "fixtures/project");

describe("orchestrator/runCategory", () => {
	it("returns null when the category has no config", async () => {
		expect(await runCategory(projectCwd, "deps", {}, {})).toBeNull();
	});

	it("returns grouped rule results for a configured category", async () => {
		const config: MonbanConfig = {
			content: {
				forbidden: [{ path: "**/*.ts", pattern: "process\\.env" }],
			},
		};
		const group = await runCategory(contentCwd, "content", config, {});
		expect(group?.category).toBe("content");
		expect(group?.results.map((r) => r.name)).toContain("forbidden");
	});

	it("passes the rule filter through to the category runner", async () => {
		const config: MonbanConfig = {
			content: {
				forbidden: [{ path: "**/*.ts", pattern: "process\\.env" }],
				required: [{ path: "**/*.ts", pattern: "Copyright" }],
			},
		};
		const group = await runCategory(contentCwd, "content", config, {
			rule: "forbidden",
		});
		expect(group?.results).toHaveLength(1);
		expect(group?.results[0].name).toBe("forbidden");
	});

	it("does not apply file-scope diff filtering to git rules", async () => {
		const repo = await createGitRepo();
		try {
			await writeAndAdd(repo, "README.md", "base\n");
			const baseSha = commit(repo, "init: base");
			commit(repo, "not-conventional");
			const config: MonbanConfig = {
				git: { commit: { message: { preset: "conventional" } } },
			};
			// If the orchestrator were to apply diff filtering to git rule
			// results, the SHA-path violations would be dropped because the
			// diff scope contains file paths, not SHAs.
			const group = await runCategory(repo, "git", config, { diff: baseSha });
			const commitMessage = group?.results.find(
				(r) => r.name === "commit.message",
			);
			expect(commitMessage?.results.length).toBeGreaterThan(0);
		} finally {
			await rm(repo, { recursive: true });
		}
	});
});

describe("orchestrator/runCategory diff scope", () => {
	let repo: string;

	beforeEach(async () => {
		repo = await createGitRepo();
		await writeAndAdd(repo, "src/old.ts", "// old\n");
		commit(repo, "init");
		await writeAndAdd(repo, "src/new.ts", "// new\n");
		commit(repo, "feat: new");
	});

	afterEach(async () => {
		await rm(repo, { recursive: true });
	});

	it("filters violations to changed files when --diff is set", async () => {
		const config: MonbanConfig = {
			content: {
				forbidden: [{ path: "src/**/*.ts", pattern: "//" }],
			},
		};
		const group = await runCategory(repo, "content", config, {
			diff: "HEAD~1",
		});
		const forbidden = group?.results.find((r) => r.name === "forbidden");
		// old.ts already existed on HEAD~1; only src/new.ts should remain.
		expect(
			forbidden?.results.every((v) => v.path.startsWith("src/new.ts")),
		).toBe(true);
	});

	it("warns and falls back to a full scan when diff base cannot be resolved", async () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			const config: MonbanConfig = {
				content: {
					forbidden: [{ path: "src/**/*.ts", pattern: "//" }],
				},
			};
			const group = await runCategory(repo, "content", config, {
				diff: "nonexistent-base",
			});
			expect(spy).toHaveBeenCalled();
			const forbidden = group?.results.find((r) => r.name === "forbidden");
			// Full scan picks up both old.ts and new.ts.
			expect(forbidden?.results.length).toBeGreaterThanOrEqual(2);
		} finally {
			spy.mockRestore();
		}
	});
});

describe("orchestrator/runAll", () => {
	it("returns only groups for configured categories", async () => {
		const config: MonbanConfig = {
			content: {
				forbidden: [{ path: "**/*.ts", pattern: "process\\.env" }],
			},
		};
		const groups = await runAll(contentCwd, config, {});
		expect(groups.map((g) => g.category)).toEqual(["content"]);
	});

	it("drops the rule filter so runAll does not error on unknown categories", async () => {
		const config: MonbanConfig = {
			content: {
				forbidden: [{ path: "**/*.ts", pattern: "process\\.env" }],
			},
			doc: {
				ref: [{ path: "fixtures/doc/valid-ref.md" }],
			},
		};
		const groups = await runAll(contentCwd, config, { rule: "forbidden" });
		// Both configured categories should run despite rule="forbidden"
		// (would be an unknown rule for doc).
		expect(groups.map((g) => g.category).sort()).toEqual(["content", "doc"]);
	});
});
