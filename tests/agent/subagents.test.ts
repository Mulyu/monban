import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkAgentSubagents } from "../../src/rules/agent/subagents.js";

const okCwd = resolve(import.meta.dirname, "../fixtures/agent-subagents-ok");
const badCwd = resolve(import.meta.dirname, "../fixtures/agent-subagents-bad");

describe("agent/subagents", () => {
	it("passes when frontmatter has all required keys", async () => {
		const results = await checkAgentSubagents(
			[
				{
					path: ".claude/agents/*.md",
					required_frontmatter_keys: ["name", "description", "model"],
				},
			],
			okCwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("flags missing required frontmatter keys", async () => {
		const results = await checkAgentSubagents(
			[
				{
					path: ".claude/agents/reviewer.md",
					required_frontmatter_keys: ["name", "description", "model"],
				},
			],
			badCwd,
			[],
		);
		const msgs = results.map((r) => r.message);
		expect(msgs.some((m) => m.includes("name"))).toBe(true);
	});

	it("flags frontmatter keys outside the allowlist", async () => {
		const results = await checkAgentSubagents(
			[
				{
					path: ".claude/agents/reviewer.md",
					allowed_frontmatter_keys: ["name", "description", "model"],
				},
			],
			badCwd,
			[],
		);
		const msgs = results.map((r) => r.message);
		expect(msgs.some((m) => m.includes("tools"))).toBe(true);
	});

	it("flags models outside the allowlist", async () => {
		const results = await checkAgentSubagents(
			[
				{
					path: ".claude/agents/reviewer.md",
					allowed_models: ["sonnet", "opus", "haiku", "inherit"],
				},
			],
			badCwd,
			[],
		);
		const msgs = results.map((r) => r.message);
		expect(msgs.some((m) => m.includes("claude-unknown-99"))).toBe(true);
	});

	it("flags subagent files without frontmatter", async () => {
		const results = await checkAgentSubagents(
			[{ path: ".claude/agents/no-frontmatter.md" }],
			badCwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("frontmatter");
	});

	it("passes valid subagent with allowed model", async () => {
		const results = await checkAgentSubagents(
			[
				{
					path: ".claude/agents/*.md",
					allowed_models: ["sonnet", "opus", "haiku"],
				},
			],
			okCwd,
			[],
		);
		expect(results).toHaveLength(0);
	});
});
