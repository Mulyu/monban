import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { runActionsRules } from "../src/rules/actions/index.js";

const cwd = resolve(import.meta.dirname, "fixtures/actions");

describe("actions integration", () => {
	it("runs all rules and returns results", async () => {
		const results = await runActionsRules(
			{
				pinned: [{ path: ".github/workflows/unpinned.yml" }],
				required: [{ file: ".github/workflows/lint.yml" }],
				forbidden: [
					{
						path: ".github/workflows/with-forbidden.yml",
						uses: "actions/create-release",
					},
				],
			},
			cwd,
			[],
		);

		expect(results).toHaveLength(3);
		expect(results[0].name).toBe("pinned");
		expect(results[1].name).toBe("required");
		expect(results[2].name).toBe("forbidden");
		expect(results[0].results.length).toBeGreaterThan(0);
		expect(results[1].results.length).toBeGreaterThan(0);
		expect(results[2].results.length).toBeGreaterThan(0);
	});

	it("filters by rule name", async () => {
		const results = await runActionsRules(
			{
				pinned: [{ path: ".github/workflows/unpinned.yml" }],
				forbidden: [
					{
						path: ".github/workflows/**/*.yml",
						uses: "actions/create-release",
					},
				],
			},
			cwd,
			[],
			"pinned",
		);

		expect(results).toHaveLength(1);
		expect(results[0].name).toBe("pinned");
	});

	it("throws on unknown rule name", async () => {
		await expect(runActionsRules({}, cwd, [], "nonexistent")).rejects.toThrow(
			"Unknown actions rule: nonexistent",
		);
	});
});
