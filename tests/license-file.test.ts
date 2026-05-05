import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkLicenseFile } from "../src/rules/license/file.js";

const okCwd = resolve(import.meta.dirname, "fixtures/license-ok");
const badCwd = resolve(import.meta.dirname, "fixtures/license-bad");

describe("license/file", () => {
	it("passes when LICENSE matches a known template in the allowed list", async () => {
		const results = await checkLicenseFile(
			[{ path: "LICENSE", allowed: ["MIT", "Apache-2.0"] }],
			okCwd,
			[],
		);
		expect(results).toEqual([]);
	});

	it("flags an unknown license body when allowed is set", async () => {
		const results = await checkLicenseFile(
			[{ path: "LICENSE", allowed: ["MIT"] }],
			badCwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].rule).toBe("file");
		expect(results[0].message).toMatch(/判別/);
	});

	it("reports missing LICENSE file", async () => {
		const results = await checkLicenseFile([{ path: "LICENSE" }], "/tmp", []);
		expect(results).toHaveLength(1);
		expect(results[0].path).toBe("LICENSE");
		expect(results[0].message).toMatch(/見つかりません/);
	});

	it("flags an SPDX tag that is not on the allowed list", async () => {
		const results = await checkLicenseFile(
			[{ path: "src/with-spdx-tag.ts", allowed: ["MIT"] }],
			okCwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("Apache-2.0");
	});

	it("respects custom severity", async () => {
		const results = await checkLicenseFile(
			[{ path: "LICENSE", allowed: ["GPL-3.0"], severity: "warn" }],
			okCwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].severity).toBe("warn");
	});
});
