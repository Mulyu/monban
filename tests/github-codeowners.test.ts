import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkGithubCodeowners } from "../src/rules/github/codeowners.js";

const cwd = resolve(import.meta.dirname, "fixtures/github-codeowners");

describe("github/codeowners", () => {
	it("passes when required owners match", async () => {
		const results = await checkGithubCodeowners(
			[
				{
					path: "src/payments/**",
					owners: ["@myorg/payments-team"],
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("reports missing owner for files under path", async () => {
		const results = await checkGithubCodeowners(
			[
				{
					path: "src/orders/**",
					owners: ["@myorg/orders-team"],
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].path).toBe("src/orders/place.ts");
		expect(results[0].message).toContain("不足");
	});

	it("supports extension-scoped CODEOWNERS", async () => {
		const results = await checkGithubCodeowners(
			[
				{
					path: "migrations/**/*.sql",
					owners: ["@myorg/dba"],
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("reports when CODEOWNERS is missing", async () => {
		const results = await checkGithubCodeowners(
			[{ path: "src/**", owners: ["@myorg/core"] }],
			resolve(import.meta.dirname, "fixtures/github"),
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("CODEOWNERS");
	});
});
