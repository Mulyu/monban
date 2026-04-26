import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkRuntimeConsistency } from "../src/rules/runtime/consistency.js";

const okCwd = resolve(import.meta.dirname, "fixtures/runtime");
const mismatchCwd = resolve(import.meta.dirname, "fixtures/runtime-mismatch");

describe("runtime/consistency", () => {
	it("passes when every source resolves to the same value", async () => {
		const results = await checkRuntimeConsistency(
			[
				{
					name: "node",
					sources: [
						{ path: ".nvmrc" },
						{ path: "package.json", json_key: "engines.node" },
						{ path: "Dockerfile", pattern: "^FROM node:([\\d.]+)" },
						{
							path: ".github/workflows/*.yml",
							yaml_key: "jobs.*.steps.*.with.node-version",
						},
					],
				},
			],
			okCwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("flags every affected file when sources disagree", async () => {
		const results = await checkRuntimeConsistency(
			[
				{
					name: "node",
					sources: [
						{ path: ".nvmrc" },
						{ path: "package.json", json_key: "engines.node" },
						{ path: "Dockerfile", pattern: "^FROM node:([\\d.]+)" },
						{
							path: ".github/workflows/*.yml",
							yaml_key: "jobs.*.steps.*.with.node-version",
						},
					],
				},
			],
			mismatchCwd,
			[],
		);

		const paths = new Set(results.map((r) => r.path));
		expect(paths).toEqual(
			new Set([
				".nvmrc",
				"package.json",
				"Dockerfile",
				".github/workflows/ci.yml",
			]),
		);
		for (const r of results) {
			expect(r.rule).toBe("consistency");
			expect(r.severity).toBe("error");
			expect(r.message).toContain("node");
			expect(r.message).toContain("18.20.0");
			expect(r.message).toContain("20.11.0");
			expect(r.message).toContain("22.0.0");
		}
	});

	it("collapses repeated values from a single source glob", async () => {
		// Two jobs in ci.yml both pin 22.0.0; should not be reported as inconsistent on its own.
		const results = await checkRuntimeConsistency(
			[
				{
					name: "node",
					sources: [
						{
							path: ".github/workflows/*.yml",
							yaml_key: "jobs.*.steps.*.with.node-version",
						},
					],
				},
			],
			mismatchCwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("respects custom severity and message", async () => {
		const results = await checkRuntimeConsistency(
			[
				{
					name: "node",
					sources: [
						{ path: ".nvmrc" },
						{ path: "package.json", json_key: "engines.node" },
					],
					severity: "warn",
					message: "custom mismatch message",
				},
			],
			mismatchCwd,
			[],
		);
		expect(results.length).toBeGreaterThan(0);
		for (const r of results) {
			expect(r.severity).toBe("warn");
			expect(r.message).toBe("custom mismatch message");
		}
	});

	it("ignores files that fail to parse", async () => {
		// When package.json doesn't parse and is the only data source, no violations are reported.
		const results = await checkRuntimeConsistency(
			[
				{
					name: "node",
					sources: [
						{ path: "Dockerfile", json_key: "engines.node" }, // Dockerfile is not JSON → skipped
						{ path: ".nvmrc" },
					],
				},
			],
			okCwd,
			[],
		);
		expect(results).toHaveLength(0);
	});
});
