import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkGithubConcurrency } from "../src/rules/github/concurrency.js";

const cwd = resolve(import.meta.dirname, "fixtures/github");

describe("github/concurrency", () => {
	it("reports missing concurrency", async () => {
		const results = await checkGithubConcurrency(
			[{ path: ".github/workflows/concurrency-missing.yml" }],
			cwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("concurrency");
	});

	it("passes when concurrency is declared", async () => {
		const results = await checkGithubConcurrency(
			[{ path: ".github/workflows/permissions-ok.yml" }],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});
});
