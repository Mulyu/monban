import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkPathCaseConflict } from "../src/rules/path/case-conflict.js";

const cwd = resolve(import.meta.dirname, "fixtures/path-extras");

describe("path/case_conflict", () => {
	it("flags filenames that differ only in case", async () => {
		const results = await checkPathCaseConflict(
			[{ path: "case-dir/*" }],
			cwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].rule).toBe("case_conflict");
		expect(results[0].message).toContain("README.md");
		expect(results[0].message).toContain("readme.md");
	});

	it("does not flag distinct filenames", async () => {
		const results = await checkPathCaseConflict(
			[{ path: "hash-target/*" }],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("respects exclude", async () => {
		const results = await checkPathCaseConflict(
			[{ path: "case-dir/*", exclude: ["case-dir/readme.md"] }],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("uses custom message and severity", async () => {
		const results = await checkPathCaseConflict(
			[
				{
					path: "case-dir/*",
					message: "case 衝突",
					severity: "warn",
				},
			],
			cwd,
			[],
		);
		expect(results[0].message).toBe("case 衝突");
		expect(results[0].severity).toBe("warn");
	});
});
