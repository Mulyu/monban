import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkAgentSettings } from "../src/rules/agent/settings.js";

const okCwd = resolve(import.meta.dirname, "fixtures/agent-settings-ok");
const badCwd = resolve(import.meta.dirname, "fixtures/agent-settings-bad");

describe("agent/settings", () => {
	it("passes for a well-formed settings.json", async () => {
		const results = await checkAgentSettings(
			[{ path: "settings.json" }],
			okCwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("flags wildcard Bash(*) permission", async () => {
		const results = await checkAgentSettings(
			[{ path: "settings.json" }],
			badCwd,
			[],
		);
		const msgs = results.map((r) => r.message);
		expect(msgs.some((m) => m.includes("Bash(*)"))).toBe(true);
	});

	it("flags Bash(rm:*) and Bash(sudo...) permissions", async () => {
		const results = await checkAgentSettings(
			[{ path: "settings.json" }],
			badCwd,
			[],
		);
		const msgs = results.map((r) => r.message);
		expect(msgs.some((m) => m.includes("Bash(rm:"))).toBe(true);
		expect(msgs.some((m) => m.includes("Bash(sudo"))).toBe(true);
	});

	it("flags WebFetch(*) permission", async () => {
		const results = await checkAgentSettings(
			[{ path: "settings.json" }],
			badCwd,
			[],
		);
		const msgs = results.map((r) => r.message);
		expect(msgs.some((m) => m.includes("WebFetch(*)"))).toBe(true);
	});

	it("flags curl/sh in hook command", async () => {
		const results = await checkAgentSettings(
			[{ path: "settings.json" }],
			badCwd,
			[],
		);
		const tokens = results
			.filter((r) => r.path.includes("hooks."))
			.map((r) => r.message);
		expect(tokens.some((m) => m.includes("curl"))).toBe(true);
	});

	it("flags npx @latest in hook command", async () => {
		const results = await checkAgentSettings(
			[{ path: "settings.json" }],
			badCwd,
			[],
		);
		const msgs = results.map((r) => r.message);
		expect(msgs.some((m) => m.includes("latest"))).toBe(true);
	});

	it("respects allowed_permissions allowlist", async () => {
		const results = await checkAgentSettings(
			[
				{
					path: "settings.json",
					allowed_permissions: ["^Bash\\(npm ", "^Bash\\(git ", "^Read"],
					forbidden_permissions: [],
				},
			],
			okCwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("flags permissions outside the allowlist", async () => {
		const results = await checkAgentSettings(
			[
				{
					path: "settings.json",
					allowed_permissions: ["^Read"],
					forbidden_permissions: [],
				},
			],
			okCwd,
			[],
		);
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].message).toContain("allowlist");
	});

	it("uses custom severity", async () => {
		const results = await checkAgentSettings(
			[{ path: "settings.json", severity: "error" }],
			badCwd,
			[],
		);
		expect(results.every((r) => r.severity === "error")).toBe(true);
	});
});
