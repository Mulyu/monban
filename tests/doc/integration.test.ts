import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { docCheck } from "../../src/rules/doc/index.js";
import type { DocConfig } from "../../src/rules/doc/types.js";

const cwd = resolve(import.meta.dirname, "../fixtures/doc");

async function run(config: DocConfig, ruleFilter?: string) {
	const results = await docCheck.run({ doc: config }, cwd, {
		globalExclude: [],
		ruleFilter,
	});
	if (results === null) throw new Error("doc check returned null");
	return results;
}

describe("doc integration", () => {
	it("runs all rules and returns results", async () => {
		const results = await run({
			ref: [{ path: "stale-ref.md" }],
			link: [{ path: "broken-links.md" }],
		});

		expect(results).toHaveLength(2);
		expect(results[0].name).toBe("ref");
		expect(results[1].name).toBe("link");
		expect(results[0].results.length).toBeGreaterThan(0);
		expect(results[1].results.length).toBeGreaterThan(0);
	});

	it("filters by rule name", async () => {
		const results = await run(
			{
				ref: [{ path: "stale-ref.md" }],
				link: [{ path: "broken-links.md" }],
			},
			"link",
		);

		expect(results).toHaveLength(1);
		expect(results[0].name).toBe("link");
	});

	it("throws on unknown rule name", async () => {
		await expect(run({}, "nonexistent")).rejects.toThrow(
			"Unknown doc rule: nonexistent",
		);
	});
});
