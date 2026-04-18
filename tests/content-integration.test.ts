import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { runContentRules } from "../src/rules/content/index.js";

const cwd = resolve(import.meta.dirname, "fixtures/content");

describe("content integration", () => {
	it("runs all rules and returns results", async () => {
		const results = await runContentRules(
			{
				forbidden: [{ path: "**/*.ts", pattern: "process\\.env" }],
				required: [
					{
						path: "**/*.ts",
						pattern: "^// Copyright \\d{4}",
						scope: "first_line",
					},
				],
			},
			cwd,
			[],
		);

		expect(results).toHaveLength(3);
		expect(results[0].name).toBe("forbidden");
		expect(results[1].name).toBe("required");
		expect(results[2].name).toBe("size");
	});

	it("filters by rule name", async () => {
		const results = await runContentRules(
			{
				forbidden: [{ path: "**/*.ts", pattern: "process\\.env" }],
				required: [{ path: "**/*.ts", pattern: "Copyright" }],
			},
			cwd,
			[],
			"forbidden",
		);

		expect(results).toHaveLength(1);
		expect(results[0].name).toBe("forbidden");
	});

	it("throws on unknown rule name", async () => {
		await expect(runContentRules({}, cwd, [], "nonexistent")).rejects.toThrow(
			"Unknown content rule: nonexistent",
		);
	});
});
