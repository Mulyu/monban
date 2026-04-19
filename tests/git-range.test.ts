import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveGitRange } from "../src/rules/git/range.js";
import { commit, createGitRepo, writeAndAdd } from "./git-helpers.js";

describe("git/resolveGitRange", () => {
	let repo: string;
	let baseSha: string;
	let headSha: string;

	let savedBaseRef: string | undefined;

	beforeEach(async () => {
		savedBaseRef = process.env.GITHUB_BASE_REF;
		delete process.env.GITHUB_BASE_REF;
		repo = await createGitRepo();
		await writeAndAdd(repo, "README.md", "base\n");
		baseSha = commit(repo, "init");
		await writeAndAdd(repo, "a.ts", "a\n");
		headSha = commit(repo, "feat: a");
	});

	afterEach(async () => {
		await rm(repo, { recursive: true });
		if (savedBaseRef === undefined) {
			delete process.env.GITHUB_BASE_REF;
		} else {
			process.env.GITHUB_BASE_REF = savedBaseRef;
		}
	});

	it("returns null when HEAD cannot be resolved", async () => {
		const empty = await mkdtemp(join(tmpdir(), "monban-empty-"));
		try {
			expect(resolveGitRange(empty, {})).toBeNull();
		} finally {
			await rm(empty, { recursive: true });
		}
	});

	it("uses explicit diff ref as base and builds ranges", () => {
		const range = resolveGitRange(repo, { diff: baseSha });
		expect(range).not.toBeNull();
		expect(range?.base).toBe(baseSha);
		expect(range?.head).toBe(headSha);
		expect(range?.commitRange).toBe(`${baseSha}..${headSha}`);
		expect(range?.diffRange).toBe(`${baseSha}...${headSha}`);
	});

	it("strips `...` / `..` suffix from explicit diff arg", () => {
		const dotdotdot = resolveGitRange(repo, { diff: `${baseSha}...HEAD` });
		expect(dotdotdot?.base).toBe(baseSha);
		const dotdot = resolveGitRange(repo, { diff: `${baseSha}..HEAD` });
		expect(dotdot?.base).toBe(baseSha);
	});

	it("returns null when explicit ref does not exist", () => {
		expect(resolveGitRange(repo, { diff: "no-such-ref" })).toBeNull();
	});

	it("auto-resolves base from main when diff=true", () => {
		// main points to headSha after the two commits; the auto path prefers
		// origin/main → main → HEAD~1. Here main exists, resolveDiffBase returns "main".
		const range = resolveGitRange(repo, { diff: true });
		expect(range).not.toBeNull();
		expect(range?.base).toBe("main");
	});

	it("falls back to HEAD~1 when diff option is absent", () => {
		const range = resolveGitRange(repo, {});
		expect(range?.base).toBe(baseSha);
		expect(range?.head).toBe(headSha);
	});

	it("returns null when diff option is absent and HEAD has no parent", async () => {
		const fresh = await createGitRepo();
		try {
			await writeAndAdd(fresh, "a.ts", "a\n");
			commit(fresh, "init");
			expect(resolveGitRange(fresh, {})).toBeNull();
		} finally {
			await rm(fresh, { recursive: true });
		}
	});
});
