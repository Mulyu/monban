import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkDocLink } from "../src/rules/doc/link.js";

const cwd = resolve(import.meta.dirname, "fixtures/doc");

describe("doc/link", () => {
	it("passes when all links are valid", async () => {
		const results = await checkDocLink([{ path: "valid-links.md" }], cwd, []);
		expect(results).toHaveLength(0);
	});

	it("reports broken relative links", async () => {
		const results = await checkDocLink([{ path: "broken-links.md" }], cwd, []);
		expect(results.length).toBeGreaterThanOrEqual(3);
		expect(results.every((r) => r.rule === "link")).toBe(true);
		expect(results.some((r) => r.message.includes("does-not-exist.ts"))).toBe(
			true,
		);
		expect(results.some((r) => r.message.includes("nowhere/file.md"))).toBe(
			true,
		);
		expect(results.some((r) => r.message.includes("not-here.md"))).toBe(true);
	});

	it("ignores external URLs", async () => {
		const results = await checkDocLink([{ path: "valid-links.md" }], cwd, []);
		const external = results.filter((r) => r.message.includes("example.com"));
		expect(external).toHaveLength(0);
	});

	it("ignores anchor-only links", async () => {
		const results = await checkDocLink([{ path: "valid-links.md" }], cwd, []);
		const anchors = results.filter((r) => r.message.includes("#valid-links"));
		expect(anchors).toHaveLength(0);
	});

	it("respects global exclude", async () => {
		const results = await checkDocLink([{ path: "**/*.md" }], cwd, [
			"**/broken-links.md",
		]);
		const broken = results.filter((r) => r.path.includes("broken-links"));
		expect(broken).toHaveLength(0);
	});
});
