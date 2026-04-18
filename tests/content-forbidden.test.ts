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
		it("detects AWS access key", async () => {
			const results = await checkContentForbidden(
				[{ path: "has-secret.ts", secret: true }],
				cwd,
				[],
			);
			const aws = results.find((r) => r.message.includes("AWS Access Key"));
			expect(aws).toBeDefined();
			expect(aws?.path).toMatch(/has-secret\.ts:\d+/);
		});

		it("detects GitHub token", async () => {
			const results = await checkContentForbidden(
				[{ path: "has-secret.ts", secret: true }],
				cwd,
				[],
			);
			const gh = results.find((r) => r.message.includes("GitHub"));
			expect(gh).toBeDefined();
		});

		it("detects Google API key", async () => {
			const results = await checkContentForbidden(
				[{ path: "has-secret.ts", secret: true }],
				cwd,
				[],
			);
			const google = results.find((r) => r.message.includes("Google API Key"));
			expect(google).toBeDefined();
		});

		it("detects Slack token", async () => {
			const results = await checkContentForbidden(
				[{ path: "has-secret.ts", secret: true }],
				cwd,
				[],
			);
			const slack = results.find((r) => r.message.includes("Slack"));
			expect(slack).toBeDefined();
		});

		it("detects JWT", async () => {
			const results = await checkContentForbidden(
				[{ path: "has-secret.ts", secret: true }],
				cwd,
				[],
			);
			const jwt = results.find((r) => r.message.includes("JWT"));
			expect(jwt).toBeDefined();
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
