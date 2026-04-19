import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkPathForbidden } from "../src/rules/path/forbidden.js";

const cwd = resolve(import.meta.dirname, "fixtures/project");

describe("path/forbidden", () => {
	it("detects files matching forbidden glob", async () => {
		const results = await checkPathForbidden(
			[{ path: "**/utils/**" }],
			cwd,
			[],
		);
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].rule).toBe("forbidden");
		expect(results[0].severity).toBe("error");
		expect(results[0].path).toContain("utils");
	});

	it("detects forbidden file extensions", async () => {
		const results = await checkPathForbidden(
			[{ path: "src/**/*.js", message: "No .js files in src/" }],
			cwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].path).toContain("legacy.js");
		expect(results[0].message).toBe("No .js files in src/");
	});

	it("returns empty when no matches", async () => {
		const results = await checkPathForbidden(
			[{ path: "**/nonexistent/**" }],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("uses custom severity", async () => {
		const results = await checkPathForbidden(
			[{ path: "src/**/*.js", severity: "warn" }],
			cwd,
			[],
		);
		expect(results[0].severity).toBe("warn");
	});

	describe("type filter", () => {
		const extrasCwd = resolve(import.meta.dirname, "fixtures/path-extras");

		it("matches only symlinks when type: symlink", async () => {
			const results = await checkPathForbidden(
				[{ path: "case-dir/*", type: "symlink" }],
				extrasCwd,
				[],
			);
			expect(results).toHaveLength(1);
			expect(results[0].path).toBe("case-dir/symlink-to-pinned");
		});

		it("matches only files when type: file", async () => {
			const results = await checkPathForbidden(
				[{ path: "case-dir/*", type: "file" }],
				extrasCwd,
				[],
			);
			// 3 regular files (README.md, readme.md, other.txt) — symlink is excluded
			expect(results.map((r) => r.path).sort()).toEqual([
				"case-dir/README.md",
				"case-dir/other.txt",
				"case-dir/readme.md",
			]);
		});
	});
});
