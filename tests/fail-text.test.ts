import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkContentForbidden } from "../src/rules/content/forbidden.js";
import { checkPathHash } from "../src/rules/path/hash.js";

const contentCwd = resolve(import.meta.dirname, "fixtures/content");
const extrasCwd = resolve(import.meta.dirname, "fixtures/path-extras");

describe("fail_text / docs_url propagation", () => {
	it("propagates fail_text and docs_url from content.forbidden into RuleResult", async () => {
		const results = await checkContentForbidden(
			[
				{
					path: "**/*.ts",
					pattern: "process\\.env",
					fail_text: "Use config injection instead of process.env",
					docs_url: "https://example.com/no-env",
				},
			],
			contentCwd,
			[],
		);
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].fail_text).toBe(
			"Use config injection instead of process.env",
		);
		expect(results[0].docs_url).toBe("https://example.com/no-env");
	});

	it("leaves fail_text and docs_url undefined when not configured", async () => {
		const results = await checkContentForbidden(
			[{ path: "**/*.ts", pattern: "process\\.env" }],
			contentCwd,
			[],
		);
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].fail_text).toBeUndefined();
		expect(results[0].docs_url).toBeUndefined();
	});

	it("propagates fail_text from path.hash into RuleResult", async () => {
		const results = await checkPathHash(
			[
				{
					path: "hash-target/pinned.txt",
					sha256: "0".repeat(64),
					fail_text: "Restore the file from the upstream template",
				},
			],
			extrasCwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].fail_text).toBe(
			"Restore the file from the upstream template",
		);
	});
});
