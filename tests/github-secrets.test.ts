import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkGithubSecrets } from "../src/rules/github/secrets.js";

const cwd = resolve(import.meta.dirname, "fixtures/github");

describe("github/secrets", () => {
	it("reports secret references not in allowlist", async () => {
		const results = await checkGithubSecrets(
			[
				{
					path: ".github/workflows/secrets.yml",
					allowed: ["NPM_TOKEN", "GITHUB_TOKEN"],
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("MYSTERY_SECRET");
	});

	it("passes when all references are allowed", async () => {
		const results = await checkGithubSecrets(
			[
				{
					path: ".github/workflows/secrets.yml",
					allowed: ["NPM_TOKEN", "GITHUB_TOKEN", "MYSTERY_SECRET"],
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("treats GITHUB_TOKEN case-insensitively", async () => {
		const results = await checkGithubSecrets(
			[
				{
					path: ".github/workflows/secrets.yml",
					allowed: ["NPM_TOKEN", "github_token", "MYSTERY_SECRET"],
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});
});
