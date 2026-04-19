import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkGithubPermissions } from "../src/rules/github/permissions.js";

const cwd = resolve(import.meta.dirname, "fixtures/github");

describe("github/permissions", () => {
	it("reports missing permissions declaration", async () => {
		const results = await checkGithubPermissions(
			[{ path: ".github/workflows/permissions-missing.yml" }],
			cwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("permissions");
	});

	it("passes when permissions is declared", async () => {
		const results = await checkGithubPermissions(
			[{ path: ".github/workflows/permissions-ok.yml" }],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("reports forbidden scalar permissions", async () => {
		const results = await checkGithubPermissions(
			[
				{
					path: ".github/workflows/permissions-write-all.yml",
					forbidden: ["write-all"],
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("write-all");
	});

	it("allows missing declaration when required=false", async () => {
		const results = await checkGithubPermissions(
			[
				{
					path: ".github/workflows/permissions-missing.yml",
					required: false,
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});
});
