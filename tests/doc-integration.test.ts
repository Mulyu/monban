import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { runDocRules } from "../src/rules/doc/index.js";

const cwd = resolve(import.meta.dirname, "fixtures/doc");

describe("doc integration", () => {
	it("runs all rules and returns results", async () => {
		const results = await runDocRules(
			{
				ref: [{ path: "stale-ref.md" }],
				link: [{ path: "broken-links.md" }],
			},
			cwd,
			[],
		);

		expect(results).toHaveLength(2);
		expect(results[0].name).toBe("ref");
		expect(results[1].name).toBe("link");
		expect(results[0].results.length).toBeGreaterThan(0);
		expect(results[1].results.length).toBeGreaterThan(0);
	});

	it("filters by rule name", async () => {
		const results = await runDocRules(
			{
				ref: [{ path: "stale-ref.md" }],
				link: [{ path: "broken-links.md" }],
			},
			cwd,
			[],
			"link",
		);

		expect(results).toHaveLength(1);
		expect(results[0].name).toBe("link");
	});

	it("throws on unknown rule name", async () => {
		await expect(runDocRules({}, cwd, [], "nonexistent")).rejects.toThrow(
			"Unknown doc rule: nonexistent",
		);
	});
});
