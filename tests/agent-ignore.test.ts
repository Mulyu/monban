import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkAgentIgnore } from "../src/rules/agent/ignore.js";

const okCwd = resolve(import.meta.dirname, "fixtures/agent-ok");
const badCwd = resolve(import.meta.dirname, "fixtures/agent-bad");

describe("agent/ignore", () => {
	it("passes when all required patterns are covered", async () => {
		const results = await checkAgentIgnore([{ path: ".llmignore" }], okCwd, []);
		expect(results).toHaveLength(0);
	});

	it("flags missing secret coverage", async () => {
		const results = await checkAgentIgnore(
			[{ path: ".llmignore" }],
			badCwd,
			[],
		);
		expect(results.length).toBeGreaterThan(0);
		const msgs = results.map((r) => r.message);
		expect(msgs.some((m) => m.includes(".env"))).toBe(true);
		expect(msgs.some((m) => m.includes("*.pem"))).toBe(true);
	});

	it("reports when the ignore file itself is missing", async () => {
		const results = await checkAgentIgnore(
			[{ path: ".nonexistent" }],
			okCwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("見つかりません");
	});

	it("supports custom must_cover list", async () => {
		const results = await checkAgentIgnore(
			[{ path: ".llmignore", must_cover: ["node_modules/"] }],
			okCwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("defaults to warn severity", async () => {
		const results = await checkAgentIgnore(
			[{ path: ".llmignore" }],
			badCwd,
			[],
		);
		expect(results[0].severity).toBe("warn");
	});
});
