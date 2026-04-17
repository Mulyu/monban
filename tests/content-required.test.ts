import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkContentRequired } from "../src/rules/content/required.js";

const cwd = resolve(import.meta.dirname, "fixtures/content");

describe("content/required", () => {
	describe("scope: file (default)", () => {
		it("passes when pattern exists anywhere in file", async () => {
			const results = await checkContentRequired(
				[{ path: "has-copyright.ts", pattern: "Copyright" }],
				cwd,
				[],
			);
			expect(results).toHaveLength(0);
		});

		it("reports when pattern is missing", async () => {
			const results = await checkContentRequired(
				[{ path: "missing-copyright.ts", pattern: "Copyright" }],
				cwd,
				[],
			);
			expect(results).toHaveLength(1);
			expect(results[0].rule).toBe("required");
			expect(results[0].path).toBe("missing-copyright.ts");
			expect(results[0].severity).toBe("error");
		});
	});

	describe("scope: first_line", () => {
		it("passes when first line matches", async () => {
			const results = await checkContentRequired(
				[
					{
						path: "has-copyright.ts",
						pattern: "^// Copyright \\d{4}",
						scope: "first_line",
					},
				],
				cwd,
				[],
			);
			expect(results).toHaveLength(0);
		});

		it("reports when first line does not match", async () => {
			const results = await checkContentRequired(
				[
					{
						path: "missing-copyright.ts",
						pattern: "^// Copyright \\d{4}",
						scope: "first_line",
					},
				],
				cwd,
				[],
			);
			expect(results).toHaveLength(1);
			expect(results[0].message).toContain("first_line");
		});
	});

	describe("scope: last_line", () => {
		it("passes when last line matches", async () => {
			const results = await checkContentRequired(
				[
					{
						path: "has-footer.ts",
						pattern: "END OF FILE",
						scope: "last_line",
					},
				],
				cwd,
				[],
			);
			expect(results).toHaveLength(0);
		});

		it("reports when last line does not match", async () => {
			const results = await checkContentRequired(
				[
					{
						path: "missing-copyright.ts",
						pattern: "END OF FILE",
						scope: "last_line",
					},
				],
				cwd,
				[],
			);
			expect(results).toHaveLength(1);
			expect(results[0].message).toContain("last_line");
		});
	});

	describe("custom message", () => {
		it("uses custom message", async () => {
			const results = await checkContentRequired(
				[
					{
						path: "missing-copyright.ts",
						pattern: "Copyright",
						message: "コピーライトヘッダーが必要です。",
					},
				],
				cwd,
				[],
			);
			expect(results[0].message).toBe("コピーライトヘッダーが必要です。");
		});
	});

	describe("globalExclude", () => {
		it("respects global exclude patterns", async () => {
			const results = await checkContentRequired(
				[{ path: "**/*.ts", pattern: "Copyright" }],
				cwd,
				["**/missing-copyright.ts"],
			);
			const missing = results.filter((r) =>
				r.path.includes("missing-copyright"),
			);
			expect(missing).toHaveLength(0);
		});
	});
});
