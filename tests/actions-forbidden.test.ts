import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkActionsForbidden } from "../src/rules/actions/forbidden.js";

const cwd = resolve(import.meta.dirname, "fixtures/actions");

describe("actions/forbidden", () => {
	it("detects forbidden action", async () => {
		const results = await checkActionsForbidden(
			[
				{
					path: ".github/workflows/with-forbidden.yml",
					uses: "actions/create-release",
					message: "release-please を使ってください。",
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].rule).toBe("forbidden");
		expect(results[0].message).toBe("release-please を使ってください。");
	});

	it("returns empty when no forbidden actions found", async () => {
		const results = await checkActionsForbidden(
			[
				{
					path: ".github/workflows/pinned.yml",
					uses: "actions/create-release",
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("uses custom severity", async () => {
		const results = await checkActionsForbidden(
			[
				{
					path: ".github/workflows/with-forbidden.yml",
					uses: "actions/create-release",
					severity: "warn",
				},
			],
			cwd,
			[],
		);
		expect(results[0].severity).toBe("warn");
	});

	it("respects global exclude", async () => {
		const results = await checkActionsForbidden(
			[
				{
					path: ".github/workflows/**/*.yml",
					uses: "actions/create-release",
				},
			],
			cwd,
			["**/*forbidden*"],
		);
		expect(results).toHaveLength(0);
	});
});
