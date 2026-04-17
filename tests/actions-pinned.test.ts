import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkActionsPinned } from "../src/rules/actions/pinned.js";

const cwd = resolve(import.meta.dirname, "fixtures/actions");

describe("actions/pinned", () => {
	it("passes when all uses are hash-pinned", async () => {
		const results = await checkActionsPinned(
			[{ path: ".github/workflows/pinned.yml" }],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("reports uses without hash pinning", async () => {
		const results = await checkActionsPinned(
			[{ path: ".github/workflows/unpinned.yml" }],
			cwd,
			[],
		);
		expect(results).toHaveLength(2);
		expect(results[0].rule).toBe("pinned");
		expect(results[0].message).toContain("actions/checkout@v4");
		expect(results[1].message).toContain("actions/setup-node@v4");
	});

	it("respects global exclude", async () => {
		const results = await checkActionsPinned(
			[{ path: ".github/workflows/**/*.yml" }],
			cwd,
			["**/*unpinned*"],
		);
		const unpinned = results.filter((r) => r.message.includes("@v4"));
		expect(unpinned).toHaveLength(0);
	});
});
