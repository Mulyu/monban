import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkDockerHealthcheck } from "../src/rules/docker/healthcheck.js";

const okCwd = resolve(import.meta.dirname, "fixtures/docker-ok");
const badCwd = resolve(import.meta.dirname, "fixtures/docker-bad");

describe("docker/healthcheck", () => {
	it("passes when HEALTHCHECK is present", async () => {
		const results = await checkDockerHealthcheck(
			[{ path: "Dockerfile" }],
			okCwd,
			[],
		);
		expect(results).toEqual([]);
	});

	it("reports missing HEALTHCHECK", async () => {
		const results = await checkDockerHealthcheck(
			[{ path: "Dockerfile" }],
			badCwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].severity).toBe("warn");
	});
});
