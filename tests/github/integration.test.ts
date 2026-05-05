import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { githubCheck } from "../../src/rules/github/index.js";
import type { GithubConfig } from "../../src/rules/github/types.js";

const cwd = resolve(import.meta.dirname, "../fixtures/github");

async function run(config: GithubConfig, ruleFilter?: string) {
	const results = await githubCheck.run({ github: config }, cwd, {
		globalExclude: [],
		ruleFilter,
	});
	if (results === null) throw new Error("github check returned null");
	return results;
}

describe("github integration", () => {
	it("runs all configured rules", async () => {
		const results = await run({
			actions: {
				pinned: [{ path: ".github/workflows/unpinned.yml" }],
				required: [{ file: ".github/workflows/lint.yml" }],
				forbidden: [
					{
						path: ".github/workflows/with-forbidden.yml",
						uses: "actions/create-release",
					},
				],
				concurrency: [{ path: ".github/workflows/concurrency-missing.yml" }],
			},
		});

		const byName = Object.fromEntries(results.map((r) => [r.name, r.results]));
		expect(byName["actions.pinned"].length).toBeGreaterThan(0);
		expect(byName["actions.required"].length).toBeGreaterThan(0);
		expect(byName["actions.forbidden"].length).toBeGreaterThan(0);
		expect(byName["actions.concurrency"].length).toBeGreaterThan(0);
	});

	it("filters by rule name", async () => {
		const results = await run(
			{
				actions: {
					pinned: [{ path: ".github/workflows/unpinned.yml" }],
					forbidden: [
						{
							path: ".github/workflows/**/*.yml",
							uses: "actions/create-release",
						},
					],
				},
			},
			"actions.pinned",
		);

		expect(results).toHaveLength(1);
		expect(results[0].name).toBe("actions.pinned");
	});

	it("throws on unknown rule name", async () => {
		await expect(run({}, "nonexistent")).rejects.toThrow(
			"Unknown github rule: nonexistent",
		);
	});
});
