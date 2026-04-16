import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkArch } from "../src/rules/arch.js";

const fixturesDir = resolve(import.meta.dirname, "fixtures/basic");

describe("arch rules", () => {
	it("passes when no rules are defined", async () => {
		const results = await checkArch({ rules: [] }, fixturesDir);
		expect(results).toEqual([]);
	});
});
