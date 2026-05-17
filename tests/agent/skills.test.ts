import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkAgentSkills } from "../../src/rules/agent/skills.js";

const okCwd = resolve(import.meta.dirname, "../fixtures/agent-skills-ok");
const badCwd = resolve(import.meta.dirname, "../fixtures/agent-skills-bad");

describe("agent/skills", () => {
	it("passes when all required keys exist and description is short enough", async () => {
		const results = await checkAgentSkills(
			[
				{
					path: ".claude/skills/*/SKILL.md",
					required_frontmatter_keys: ["name", "description"],
					max_description_length: 50,
				},
			],
			okCwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("flags missing required keys", async () => {
		const results = await checkAgentSkills(
			[
				{
					path: ".claude/skills/*/SKILL.md",
					required_frontmatter_keys: ["name", "description"],
				},
			],
			badCwd,
			[],
		);
		const msgs = results.map((r) => r.message);
		expect(msgs.some((m) => m.includes("name"))).toBe(true);
	});

	it("flags description exceeding the max length", async () => {
		const results = await checkAgentSkills(
			[
				{
					path: ".claude/skills/*/SKILL.md",
					max_description_length: 30,
				},
			],
			badCwd,
			[],
		);
		const msgs = results.map((r) => r.message);
		expect(msgs.some((m) => m.includes("description"))).toBe(true);
	});

	it("flags frontmatter keys outside the allowlist", async () => {
		const results = await checkAgentSkills(
			[
				{
					path: ".claude/skills/*/SKILL.md",
					allowed_frontmatter_keys: ["name", "description"],
				},
			],
			badCwd,
			[],
		);
		const msgs = results.map((r) => r.message);
		expect(msgs.some((m) => m.includes("extra_unknown_key"))).toBe(true);
	});
});
