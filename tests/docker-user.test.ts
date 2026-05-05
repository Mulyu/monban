import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkDockerUser } from "../src/rules/docker/user.js";

const okCwd = resolve(import.meta.dirname, "fixtures/docker-ok");
const badCwd = resolve(import.meta.dirname, "fixtures/docker-bad");

describe("docker/user", () => {
	it("passes when USER is set to a non-root account", async () => {
		const results = await checkDockerUser([{ path: "Dockerfile" }], okCwd, []);
		expect(results).toEqual([]);
	});

	it("flags USER root", async () => {
		const results = await checkDockerUser([{ path: "Dockerfile" }], badCwd, []);
		expect(results.some((r) => r.message.includes("root"))).toBe(true);
	});

	it("reports missing USER when required", async () => {
		const cwd = resolve(import.meta.dirname, "fixtures/docker-ok");
		const results = await checkDockerUser(
			[{ path: "Dockerfile", required: true, forbidden: ["root"] }],
			cwd,
			[],
		);
		expect(results).toEqual([]);
	});
});
