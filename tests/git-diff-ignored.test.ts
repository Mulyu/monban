import { rm } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkGitDiffIgnored } from "../src/rules/git/diff-ignored.js";
import { commit, createGitRepo, writeAndAdd } from "./git-helpers.js";

describe("git/diff.ignored", () => {
	let repo: string;
	let base: string;

	beforeEach(async () => {
		repo = await createGitRepo();
		await writeAndAdd(repo, ".gitignore", ".env*\n.vscode/\n");
		await writeAndAdd(repo, "README.md", "base\n");
		base = commit(repo, "init");
	});

	afterEach(async () => {
		await rm(repo, { recursive: true });
	});

	it("returns empty when rule is undefined", () => {
		const results = checkGitDiffIgnored(undefined, repo, `${base}...HEAD`);
		expect(results).toHaveLength(0);
	});

	it("detects files that match .gitignore but are tracked", async () => {
		await writeAndAdd(repo, ".env.local", "SECRET=1\n");
		commit(repo, "chore: add env");
		const results = checkGitDiffIgnored({}, repo, `${base}...HEAD`);
		expect(results).toHaveLength(1);
		expect(results[0].path).toBe(".env.local");
	});

	it("passes when no ignored-but-tracked files exist", async () => {
		await writeAndAdd(repo, "src/app.ts", "// app\n");
		commit(repo, "feat: add app");
		const results = checkGitDiffIgnored({}, repo, `${base}...HEAD`);
		expect(results).toHaveLength(0);
	});

	it("respects allowed patterns", async () => {
		await writeAndAdd(repo, ".env.local", "SECRET=1\n");
		commit(repo, "chore: add env");
		const results = checkGitDiffIgnored(
			{ allowed: [".env.local"] },
			repo,
			`${base}...HEAD`,
		);
		expect(results).toHaveLength(0);
	});

	it("uses warn severity by default", async () => {
		await writeAndAdd(repo, ".env.local", "SECRET=1\n");
		commit(repo, "chore: add env");
		const results = checkGitDiffIgnored({}, repo, `${base}...HEAD`);
		expect(results[0].severity).toBe("warn");
	});

	it("scopes to diff by default (ignores older violations)", async () => {
		// Add the ignored-but-tracked file in the base commit
		const ignoredTracked = ".vscode/settings.json";
		await writeAndAdd(repo, ignoredTracked, "{}\n");
		const newBase = commit(repo, "chore: add existing vscode settings");

		// make a new commit with a clean file
		await writeAndAdd(repo, "src/app.ts", "// app\n");
		commit(repo, "feat: add app");

		const results = checkGitDiffIgnored({}, repo, `${newBase}...HEAD`);
		expect(results).toHaveLength(0);
	});

	it("scope=all flags even pre-existing violations", async () => {
		await writeAndAdd(repo, ".vscode/settings.json", "{}\n");
		commit(repo, "chore: add existing settings");

		const results = checkGitDiffIgnored(
			{ scope: "all" },
			repo,
			`${base}...HEAD`,
		);
		expect(results).toHaveLength(1);
		expect(results[0].path).toBe(".vscode/settings.json");
	});

	it("uses custom message", async () => {
		await writeAndAdd(repo, ".env.local", "SECRET=1\n");
		commit(repo, "chore");
		const results = checkGitDiffIgnored(
			{ message: "Custom message text." },
			repo,
			`${base}...HEAD`,
		);
		expect(results[0].message).toBe("Custom message text.");
	});
});
