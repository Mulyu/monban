import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkAgentMcp } from "../src/rules/agent/mcp.js";

const okCwd = resolve(import.meta.dirname, "fixtures/agent-ok");
const badCwd = resolve(import.meta.dirname, "fixtures/agent-bad");

describe("agent/mcp", () => {
	it("passes for a well-formed .mcp.json", async () => {
		const results = await checkAgentMcp([{ path: ".mcp.json" }], okCwd, []);
		expect(results).toHaveLength(0);
	});

	it("flags forbidden shell commands", async () => {
		const results = await checkAgentMcp([{ path: ".mcp.json" }], badCwd, []);
		const msgs = results.map((r) => r.message);
		expect(msgs.some((m) => m.includes("command=bash"))).toBe(true);
	});

	it("flags npx pkg@latest", async () => {
		const results = await checkAgentMcp([{ path: ".mcp.json" }], badCwd, []);
		const msgs = results.map((r) => r.message);
		expect(msgs.some((m) => m.includes("latest"))).toBe(true);
	});

	it("flags hardcoded env secrets", async () => {
		const results = await checkAgentMcp([{ path: ".mcp.json" }], badCwd, []);
		const msgs = results.map((r) => r.message);
		expect(msgs.some((m) => m.includes("GITHUB_TOKEN"))).toBe(true);
	});

	it("respects allowed_servers", async () => {
		const results = await checkAgentMcp(
			[{ path: ".mcp.json", allowed_servers: ["github"] }],
			okCwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("flags servers outside allowlist", async () => {
		const results = await checkAgentMcp(
			[{ path: ".mcp.json", allowed_servers: ["other-only"] }],
			okCwd,
			[],
		);
		expect(results.length).toBe(1);
		expect(results[0].message).toContain("allowlist");
	});

	it("flags forbidden servers", async () => {
		const results = await checkAgentMcp(
			[{ path: ".mcp.json", forbidden_servers: ["github"] }],
			okCwd,
			[],
		);
		expect(results.length).toBe(1);
		expect(results[0].message).toContain("forbidden");
	});
});
