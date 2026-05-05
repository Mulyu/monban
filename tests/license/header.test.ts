import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkLicenseHeader } from "../../src/rules/license/header.js";

const okCwd = resolve(import.meta.dirname, "../fixtures/license-ok");
const badCwd = resolve(import.meta.dirname, "../fixtures/license-bad");

describe("license/header", () => {
	it("passes when every source has a permitted SPDX header", async () => {
		const results = await checkLicenseHeader(
			[{ path: "src/**/*.ts", allowed: ["MIT", "Apache-2.0"] }],
			okCwd,
			[],
		);
		expect(results).toEqual([]);
	});

	it("flags missing header and disallowed SPDX id", async () => {
		const results = await checkLicenseHeader(
			[{ path: "src/**/*.ts", allowed: ["MIT"] }],
			badCwd,
			[],
		);
		expect(results.map((r) => r.path).sort()).toEqual([
			"src/no-header.ts",
			"src/wrong-spdx.ts",
		]);
		const noHeader = results.find((r) => r.path === "src/no-header.ts");
		expect(noHeader?.message).toMatch(/SPDX-License-Identifier/);
		const wrong = results.find((r) => r.path === "src/wrong-spdx.ts");
		expect(wrong?.message).toContain("GPL-3.0");
	});

	it("respects within_lines (does not look beyond head)", async () => {
		const cwd = resolve(import.meta.dirname, "../fixtures/license-bad");
		// no-header.ts: header is absent regardless of range
		const results = await checkLicenseHeader(
			[{ path: "src/no-header.ts", within_lines: 3 }],
			cwd,
			[],
		);
		expect(results).toHaveLength(1);
	});

	it("defaults to warn severity", async () => {
		const results = await checkLicenseHeader(
			[{ path: "src/no-header.ts" }],
			badCwd,
			[],
		);
		expect(results[0]?.severity).toBe("warn");
	});

	it("honors exclude globs", async () => {
		const results = await checkLicenseHeader(
			[
				{
					path: "src/**/*.ts",
					exclude: ["src/no-header.ts"],
					allowed: ["MIT"],
				},
			],
			badCwd,
			[],
		);
		expect(results.map((r) => r.path)).toEqual(["src/wrong-spdx.ts"]);
	});
});
