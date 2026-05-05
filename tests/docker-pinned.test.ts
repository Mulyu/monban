import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkDockerPinned } from "../src/rules/docker/pinned.js";

const okCwd = resolve(import.meta.dirname, "fixtures/docker-ok");
const badCwd = resolve(import.meta.dirname, "fixtures/docker-bad");

describe("docker/pinned", () => {
	it("passes when every FROM has a concrete tag", async () => {
		const results = await checkDockerPinned(
			[{ path: "Dockerfile" }],
			okCwd,
			[],
		);
		expect(results).toEqual([]);
	});

	it("flags FROM image:latest", async () => {
		const results = await checkDockerPinned(
			[{ path: "Dockerfile" }],
			badCwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].rule).toBe("pinned");
		expect(results[0].message).toMatch(/latest/);
	});

	it("requires digest pinning when digest=true", async () => {
		const results = await checkDockerPinned(
			[{ path: "Dockerfile", digest: true }],
			okCwd,
			[],
		);
		expect(results.length).toBeGreaterThan(0);
		for (const r of results) {
			expect(r.message).toMatch(/digest/);
		}
	});

	it("ignores stage references in multi-stage builds", async () => {
		const results = await checkDockerPinned(
			[{ path: "Dockerfile" }],
			okCwd,
			[],
		);
		// docker-ok has FROM ... AS builder + FROM node:20.11.0-alpine
		// COPY --from=builder must not be flagged
		expect(results).toHaveLength(0);
	});
});
