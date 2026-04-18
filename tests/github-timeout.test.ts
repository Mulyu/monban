import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkGithubTimeout } from "../src/rules/github/timeout.js";

const cwd = resolve(import.meta.dirname, "fixtures/github");

describe("github/timeout", () => {
	it("reports missing timeout-minutes and exceeded values", async () => {
		const results = await checkGithubTimeout(
			[{ path: ".github/workflows/timeout-missing.yml", max: 30 }],
			cwd,
			[],
		);
		expect(results).toHaveLength(2);
		expect(results[0].message).toContain("timeout-minutes");
		expect(results[1].message).toContain("上限");
	});

	it("passes when every job has timeout-minutes within max", async () => {
		const results = await checkGithubTimeout(
			[{ path: ".github/workflows/permissions-ok.yml", max: 30 }],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("skips reusable workflow jobs", async () => {
		const results = await checkGithubTimeout(
			[{ path: ".github/workflows/reusable.yml", max: 30 }],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});
});
