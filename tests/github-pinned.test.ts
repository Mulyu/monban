import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkGithubPinned } from "../src/rules/github/pinned.js";

const cwd = resolve(import.meta.dirname, "fixtures/github");

describe("github/pinned", () => {
	it("passes when all action uses are hash-pinned", async () => {
		const results = await checkGithubPinned(
			[{ path: ".github/workflows/pinned.yml" }],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("reports uses without hash pinning", async () => {
		const results = await checkGithubPinned(
			[{ path: ".github/workflows/unpinned.yml" }],
			cwd,
			[],
		);
		expect(results).toHaveLength(2);
		expect(results[0].rule).toBe("actions.pinned");
	});

	it("skips reusable workflows by default", async () => {
		const results = await checkGithubPinned(
			[{ path: ".github/workflows/reusable.yml" }],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("detects reusable workflow pinning when target enabled", async () => {
		const results = await checkGithubPinned(
			[
				{
					path: ".github/workflows/reusable.yml",
					targets: ["reusable"],
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("@v1");
	});

	it("detects docker image pinning when target enabled", async () => {
		const results = await checkGithubPinned(
			[
				{
					path: ".github/workflows/docker.yml",
					targets: ["docker"],
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("docker://alpine:3.18");
	});

	it("respects global exclude", async () => {
		const results = await checkGithubPinned(
			[{ path: ".github/workflows/**/*.yml" }],
			cwd,
			["**/*unpinned*"],
		);
		const fromUnpinned = results.filter((r) => r.path.includes("unpinned"));
		expect(fromUnpinned).toHaveLength(0);
	});
});
