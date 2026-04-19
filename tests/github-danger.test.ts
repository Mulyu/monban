import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkGithubActionsDanger } from "../src/rules/github/danger.js";

const cwd = resolve(import.meta.dirname, "fixtures/github");

describe("github/actions.danger", () => {
	it("flags pull_request_target + actions/checkout combination", async () => {
		const results = await checkGithubActionsDanger(
			[{ path: ".github/workflows/danger-pr-target.yml" }],
			cwd,
			[],
		);
		const ptResult = results.find((r) =>
			r.message.includes("pull_request_target"),
		);
		expect(ptResult).toBeDefined();
		expect(ptResult?.severity).toBe("error");
	});

	it("flags missing persist-credentials: false on actions/checkout", async () => {
		const results = await checkGithubActionsDanger(
			[{ path: ".github/workflows/danger-pr-target.yml" }],
			cwd,
			[],
		);
		const persist = results.find((r) =>
			r.message.includes("persist-credentials"),
		);
		expect(persist).toBeDefined();
	});

	it("does not flag safe workflows with persist-credentials: false", async () => {
		const results = await checkGithubActionsDanger(
			[{ path: ".github/workflows/danger-safe.yml" }],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("uses custom severity", async () => {
		const results = await checkGithubActionsDanger(
			[{ path: ".github/workflows/danger-pr-target.yml", severity: "warn" }],
			cwd,
			[],
		);
		expect(results.every((r) => r.severity === "warn")).toBe(true);
	});
});
