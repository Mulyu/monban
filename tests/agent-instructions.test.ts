import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkAgentInstructions } from "../src/rules/agent/instructions.js";

const okCwd = resolve(import.meta.dirname, "fixtures/agent-ok");
const badCwd = resolve(import.meta.dirname, "fixtures/agent-bad");

describe("agent/instructions", () => {
	it("reports when AGENTS.md is missing", async () => {
		const results = await checkAgentInstructions(
			[{ path: "MISSING.md" }],
			okCwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("見つかりません");
	});

	it("reports missing required sections", async () => {
		const results = await checkAgentInstructions(
			[
				{
					path: "AGENTS.md",
					required_sections: ["Commands", "Testing", "Style", "Boundaries"],
				},
			],
			badCwd,
			[],
		);
		expect(results.length).toBe(4);
		const msgs = results.map((r) => r.message);
		expect(msgs.some((m) => m.includes("Commands"))).toBe(true);
		expect(msgs.some((m) => m.includes("Boundaries"))).toBe(true);
	});

	it("passes when all required sections exist", async () => {
		const results = await checkAgentInstructions(
			[
				{
					path: "AGENTS.md",
					required_sections: ["Commands", "Testing", "Style", "Boundaries"],
				},
			],
			okCwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("flags frontmatter keys outside allowlist", async () => {
		const results = await checkAgentInstructions(
			[
				{
					path: "AGENTS.md",
					frontmatter_keys: ["description"], // tags is not allowed
				},
			],
			okCwd,
			[],
		);
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].message).toContain("tags");
	});

	it("passes when frontmatter keys are within allowlist", async () => {
		const results = await checkAgentInstructions(
			[
				{
					path: "AGENTS.md",
					frontmatter_keys: ["description", "tags"],
				},
			],
			okCwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("flags files larger than max_bytes", async () => {
		const results = await checkAgentInstructions(
			[{ path: "AGENTS.md", max_bytes: 50 }],
			okCwd,
			[],
		);
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].message).toContain("上限");
	});

	it("defaults to warn severity", async () => {
		const results = await checkAgentInstructions(
			[{ path: "AGENTS.md", required_sections: ["Nonexistent"] }],
			okCwd,
			[],
		);
		expect(results[0].severity).toBe("warn");
	});
});
