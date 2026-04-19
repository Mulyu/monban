import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkGithubActionsInjection } from "../src/rules/github/injection.js";

const cwd = resolve(import.meta.dirname, "fixtures/github");

describe("github/actions.injection", () => {
	it("flags github.event.issue.title used in run:", async () => {
		const results = await checkGithubActionsInjection(
			[{ path: ".github/workflows/injection-issue-title.yml" }],
			cwd,
			[],
		);
		expect(results.length).toBeGreaterThan(0);
		expect(
			results.some((r) => r.message.includes("github.event.issue.title")),
		).toBe(true);
		expect(
			results.some((r) => r.message.includes("github.event.issue.body")),
		).toBe(true);
	});

	it("does not flag the same expression when only used in env:", async () => {
		const results = await checkGithubActionsInjection(
			[{ path: ".github/workflows/injection-safe.yml" }],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("respects allow_contexts", async () => {
		const results = await checkGithubActionsInjection(
			[
				{
					path: ".github/workflows/injection-issue-title.yml",
					allow_contexts: [
						"github.event.issue.title",
						"github.event.issue.body",
					],
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("uses custom severity", async () => {
		const results = await checkGithubActionsInjection(
			[
				{
					path: ".github/workflows/injection-issue-title.yml",
					severity: "warn",
				},
			],
			cwd,
			[],
		);
		expect(results.every((r) => r.severity === "warn")).toBe(true);
	});
});
