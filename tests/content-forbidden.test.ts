import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkContentForbidden } from "../src/rules/content/forbidden.js";

const cwd = resolve(import.meta.dirname, "fixtures/content");

describe("content/forbidden", () => {
	describe("pattern", () => {
		it("detects forbidden text pattern with line number", async () => {
			const results = await checkContentForbidden(
				[{ path: "**/*.ts", pattern: "process\\.env" }],
				cwd,
				[],
			);
			expect(results.length).toBeGreaterThan(0);
			expect(results[0].rule).toBe("forbidden");
			expect(results[0].path).toMatch(/has-forbidden-pattern\.ts:\d+/);
			expect(results[0].severity).toBe("error");
		});

		it("returns empty when pattern not found", async () => {
			const results = await checkContentForbidden(
				[{ path: "**/*.ts", pattern: "NONEXISTENT_PATTERN_XYZ" }],
				cwd,
				[],
			);
			expect(results).toHaveLength(0);
		});

		it("uses custom message", async () => {
			const results = await checkContentForbidden(
				[
					{
						path: "**/*.ts",
						pattern: "process\\.env",
						message: "No env access",
					},
				],
				cwd,
				[],
			);
			expect(results[0].message).toBe("No env access");
		});

		it("uses custom severity", async () => {
			const results = await checkContentForbidden(
				[
					{
						path: "**/*.ts",
						pattern: "process\\.env",
						severity: "warn",
					},
				],
				cwd,
				[],
			);
			expect(results[0].severity).toBe("warn");
		});
	});

	describe("bom", () => {
		it("detects BOM in file", async () => {
			const results = await checkContentForbidden(
				[{ path: "**/*.txt", bom: true }],
				cwd,
				[],
			);
			expect(results.length).toBeGreaterThan(0);
			expect(results[0].rule).toBe("forbidden");
			expect(results[0].path).toBe("has-bom.txt");
			expect(results[0].message).toContain("BOM");
		});

		it("does not flag files without BOM", async () => {
			const results = await checkContentForbidden(
				[{ path: "clean.ts", bom: true }],
				cwd,
				[],
			);
			expect(results).toHaveLength(0);
		});
	});

	describe("invisible", () => {
		it("detects invisible Unicode characters", async () => {
			const results = await checkContentForbidden(
				[{ path: "has-invisible.ts", invisible: true }],
				cwd,
				[],
			);
			expect(results.length).toBeGreaterThan(0);
			expect(results[0].rule).toBe("forbidden");
			expect(results[0].path).toMatch(/has-invisible\.ts:\d+/);
			expect(results[0].message).toContain("U+200B");
		});

		it("does not flag clean files", async () => {
			const results = await checkContentForbidden(
				[{ path: "clean.ts", invisible: true }],
				cwd,
				[],
			);
			expect(results).toHaveLength(0);
		});
	});

	describe("secret", () => {
		it.each([
			["AWS Access Key"],
			["GitHub"],
			["Google API Key"],
			["Slack"],
			["JWT"],
		])("detects %s", async (kind) => {
			const results = await checkContentForbidden(
				[{ path: "has-secret.ts", secret: true }],
				cwd,
				[],
			);
			const hit = results.find((r) => r.message.includes(kind));
			expect(hit).toBeDefined();
			expect(hit?.path).toMatch(/has-secret\.ts:\d+/);
		});

		it("does not flag non-secret strings", async () => {
			const results = await checkContentForbidden(
				[{ path: "no-secret.ts", secret: true }],
				cwd,
				[],
			);
			expect(results).toHaveLength(0);
		});

		it("uses custom message", async () => {
			const results = await checkContentForbidden(
				[
					{
						path: "has-secret.ts",
						secret: true,
						message: "シークレット禁止",
					},
				],
				cwd,
				[],
			);
			expect(results.length).toBeGreaterThan(0);
			expect(results[0].message).toBe("シークレット禁止");
		});
	});

	describe("injection", () => {
		it("detects Unicode tag block characters", async () => {
			const results = await checkContentForbidden(
				[{ path: "has-tag-block.ts", injection: true }],
				cwd,
				[],
			);
			expect(results.length).toBeGreaterThan(0);
			expect(results[0].message).toContain("Tag");
			expect(results[0].message).toContain("U+E0041");
			expect(results[0].path).toMatch(/has-tag-block\.ts:\d+/);
		});

		it("detects bidi control characters", async () => {
			const results = await checkContentForbidden(
				[{ path: "has-bidi.ts", injection: true }],
				cwd,
				[],
			);
			expect(results.length).toBeGreaterThan(0);
			expect(results[0].message).toContain("双方向");
			expect(results[0].message).toContain("U+202E");
		});

		it("detects injection phrases in docs", async () => {
			const results = await checkContentForbidden(
				[{ path: "has-injection.md", injection: true }],
				cwd,
				[],
			);
			const phrase = results.find((r) => r.message.includes("指示上書き"));
			expect(phrase).toBeDefined();
		});

		it("does not flag clean files", async () => {
			const results = await checkContentForbidden(
				[{ path: "clean.ts", injection: true }],
				cwd,
				[],
			);
			expect(results).toHaveLength(0);
		});
	});

	describe("conflict", () => {
		it("detects merge conflict markers", async () => {
			const results = await checkContentForbidden(
				[{ path: "has-conflict.ts", conflict: true }],
				cwd,
				[],
			);
			expect(results.length).toBe(3);
			const markers = results.map((r) => r.message);
			expect(markers.some((m) => m.includes("<<<<<<<"))).toBe(true);
			expect(markers.some((m) => m.includes("======="))).toBe(true);
			expect(markers.some((m) => m.includes(">>>>>>>"))).toBe(true);
		});

		it("does not flag clean files", async () => {
			const results = await checkContentForbidden(
				[{ path: "clean.ts", conflict: true }],
				cwd,
				[],
			);
			expect(results).toHaveLength(0);
		});

		it("does not flag 7-equals inside a longer line", async () => {
			const results = await checkContentForbidden(
				[{ path: "has-copyright.ts", conflict: true }],
				cwd,
				[],
			);
			expect(results).toHaveLength(0);
		});
	});

	describe("globalExclude", () => {
		it("respects global exclude patterns", async () => {
			const results = await checkContentForbidden(
				[{ path: "**/*.ts", pattern: "process\\.env" }],
				cwd,
				["**/has-forbidden-pattern.ts"],
			);
			expect(results).toHaveLength(0);
		});
	});

	describe("rule-level exclude", () => {
		it("respects per-rule exclude patterns", async () => {
			const results = await checkContentForbidden(
				[
					{
						path: "**/*.ts",
						exclude: ["**/has-forbidden-pattern.ts"],
						pattern: "process\\.env",
					},
				],
				cwd,
				[],
			);
			expect(results).toHaveLength(0);
		});
	});
});
