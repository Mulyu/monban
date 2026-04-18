import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkGithubConsistency } from "../src/rules/github/consistency.js";

const cwd = resolve(import.meta.dirname, "fixtures/github");

describe("github/consistency", () => {
	it("reports mixed versions of the same action", async () => {
		const results = await checkGithubConsistency(
			[
				{
					path: ".github/workflows/consistency-*.yml",
					actions: ["actions/checkout"],
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(2);
		expect(results[0].message).toContain("actions/checkout");
		expect(results[0].message).toContain("@v3");
		expect(results[0].message).toContain("@v4");
	});

	it("passes when versions are consistent", async () => {
		const results = await checkGithubConsistency(
			[
				{
					path: ".github/workflows/consistency-v4.yml",
					actions: ["actions/checkout"],
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});
});
