import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkContentForbidden } from "../src/rules/content/forbidden.js";
import { checkContentRequired } from "../src/rules/content/required.js";

const cwd = resolve(import.meta.dirname, "fixtures/content-json");

describe("content/forbidden json_key", () => {
	it("matches dangerous pattern under scripts.* wildcard", async () => {
		const results = await checkContentForbidden(
			[
				{
					path: "package-dangerous.json",
					json_key: "scripts.*",
					pattern: "curl|wget|\\brm\\s+-rf",
				},
			],
			cwd,
			[],
		);
		expect(results.length).toBe(2);
		const keys = results.map((r) => r.path);
		expect(keys.some((k) => k.endsWith(":scripts.postinstall"))).toBe(true);
		expect(keys.some((k) => k.endsWith(":scripts.preinstall"))).toBe(true);
	});

	it("ignores safe scripts", async () => {
		const results = await checkContentForbidden(
			[
				{
					path: "package-safe.json",
					json_key: "scripts.*",
					pattern: "curl|wget|\\brm\\s+-rf",
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("matches exact key without wildcard", async () => {
		const results = await checkContentForbidden(
			[
				{
					path: "package-dangerous.json",
					json_key: "scripts.postinstall",
					pattern: "curl",
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].path).toContain("scripts.postinstall");
	});

	it("flags mere existence when no pattern is given", async () => {
		const results = await checkContentForbidden(
			[
				{
					path: "package-dangerous.json",
					json_key: "scripts.postinstall",
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("禁止キー");
	});
});

describe("content/required json_key", () => {
	it("passes when required key exists", async () => {
		const results = await checkContentRequired(
			[
				{
					path: "package-license.json",
					json_key: "license",
					pattern: ".+",
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("flags missing key", async () => {
		const results = await checkContentRequired(
			[
				{
					path: "package-missing.json",
					json_key: "license",
					pattern: ".+",
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("必須キー");
	});

	it("flags value that does not match pattern", async () => {
		const results = await checkContentRequired(
			[
				{
					path: "package-license.json",
					json_key: "license",
					pattern: "^Apache-",
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].path).toContain("license");
	});
});
