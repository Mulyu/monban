import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkGithubRunner } from "../src/rules/github/runner.js";

const cwd = resolve(import.meta.dirname, "fixtures/github");

describe("github/runner", () => {
	it("reports disallowed runner", async () => {
		const results = await checkGithubRunner(
			[
				{
					path: ".github/workflows/runner-self-hosted.yml",
					allowed: ["ubuntu-latest"],
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("self-hosted");
	});

	it("passes when runner is allowed", async () => {
		const results = await checkGithubRunner(
			[
				{
					path: ".github/workflows/pinned.yml",
					allowed: ["ubuntu-latest"],
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});
});
