import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkGithubTriggers } from "../src/rules/github/triggers.js";

const cwd = resolve(import.meta.dirname, "fixtures/github");

describe("github/triggers", () => {
	it("detects forbidden trigger", async () => {
		const results = await checkGithubTriggers(
			[
				{
					path: ".github/workflows/triggers-pr-target.yml",
					forbidden: ["pull_request_target"],
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("pull_request_target");
	});

	it("passes when trigger is allowed", async () => {
		const results = await checkGithubTriggers(
			[
				{
					path: ".github/workflows/triggers-ok.yml",
					allowed: ["push", "pull_request", "workflow_dispatch"],
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("reports trigger not in allowed list", async () => {
		const results = await checkGithubTriggers(
			[
				{
					path: ".github/workflows/triggers-pr-target.yml",
					allowed: ["push", "pull_request"],
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("pull_request_target");
	});
});
