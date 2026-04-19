import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkGithubForbidden } from "../src/rules/github/forbidden.js";

const cwd = resolve(import.meta.dirname, "fixtures/github");

describe("github/forbidden", () => {
	it("detects forbidden action", async () => {
		const results = await checkGithubForbidden(
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
		expect(results[0].message).toBe("release-please を使ってください。");
	});

	it("returns empty when no forbidden actions found", async () => {
		const results = await checkGithubForbidden(
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
		const results = await checkGithubForbidden(
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

	it("accepts uses as an array of prefixes", async () => {
		const results = await checkGithubForbidden(
			[
				{
					path: ".github/workflows/with-forbidden.yml",
					uses: ["actions/upload-release-asset", "actions/create-release"],
					message: "release-please を使ってください。",
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toBe("release-please を使ってください。");
	});
});
