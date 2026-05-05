import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { contentCheck } from "../../src/rules/content/index.js";
import type { ContentConfig } from "../../src/rules/content/types.js";

const cwd = resolve(import.meta.dirname, "../fixtures/content");

async function run(config: ContentConfig, ruleFilter?: string) {
	const results = await contentCheck.run({ content: config }, cwd, {
		globalExclude: [],
		ruleFilter,
	});
	if (results === null) throw new Error("content check returned null");
	return results;
}

describe("content integration", () => {
	it("runs all rules and returns results", async () => {
		const results = await run({
			forbidden: [{ path: "**/*.ts", pattern: "process\\.env" }],
			required: [
				{
					path: "**/*.ts",
					pattern: "^// Copyright \\d{4}",
					scope: "first_line",
				},
			],
		});

		expect(results).toHaveLength(3);
		expect(results[0].name).toBe("forbidden");
		expect(results[1].name).toBe("required");
		expect(results[2].name).toBe("size");
	});

	it("filters by rule name", async () => {
		const results = await run(
			{
				forbidden: [{ path: "**/*.ts", pattern: "process\\.env" }],
				required: [{ path: "**/*.ts", pattern: "Copyright" }],
			},
			"forbidden",
		);

		expect(results).toHaveLength(1);
		expect(results[0].name).toBe("forbidden");
	});

	it("throws on unknown rule name", async () => {
		await expect(run({}, "nonexistent")).rejects.toThrow(
			"Unknown content rule: nonexistent",
		);
	});
});
