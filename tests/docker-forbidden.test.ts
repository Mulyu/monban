import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkDockerForbidden } from "../src/rules/docker/forbidden.js";

const okCwd = resolve(import.meta.dirname, "fixtures/docker-ok");
const badCwd = resolve(import.meta.dirname, "fixtures/docker-bad");

describe("docker/forbidden", () => {
	it("flags ADD with a URL pattern", async () => {
		const results = await checkDockerForbidden(
			[
				{
					path: "Dockerfile",
					instructions: [{ name: "ADD", pattern: "^https?://" }],
				},
			],
			badCwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toMatch(/ADD/);
	});

	it("does not flag when no instruction matches", async () => {
		const results = await checkDockerForbidden(
			[
				{
					path: "Dockerfile",
					instructions: [{ name: "ADD", pattern: "^https?://" }],
				},
			],
			okCwd,
			[],
		);
		expect(results).toEqual([]);
	});

	it("flags an instruction wholesale when no pattern is given", async () => {
		const results = await checkDockerForbidden(
			[
				{
					path: "Dockerfile",
					instructions: [{ name: "ADD" }],
				},
			],
			badCwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toMatch(/ADD/);
	});
});
