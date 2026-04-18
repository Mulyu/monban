import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkPathNaming } from "../src/rules/path/naming.js";

const cwd = resolve(import.meta.dirname, "fixtures/project");

describe("path/naming", () => {
	it("passes PascalCase files", async () => {
		const results = await checkPathNaming(
			[{ path: "src/components/UserProfile.tsx", style: "pascal" }],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("detects non-PascalCase files", async () => {
		const results = await checkPathNaming(
			[{ path: "src/components/**/*.tsx", style: "pascal" }],
			cwd,
			[],
		);
		// user_card.tsx violates PascalCase
		const violations = results.filter((r) => r.path.includes("user_card"));
		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain("pascal");
	});

	it("checks prefix requirement", async () => {
		const results = await checkPathNaming(
			[{ path: "src/hooks/**/*.ts", style: "camel", prefix: "use" }],
			cwd,
			[],
		);
		// useAuth.ts -> pass (has prefix, "Auth" after removing "use" may or may not be camelCase,
		// but actually the full name "useAuth" is checked... let me reconsider)
		// fetch.ts -> fail (no "use" prefix)
		const violations = results.filter((r) => r.path.includes("fetch"));
		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('prefix "use"');
	});

	it("checks suffix requirement", async () => {
		const results = await checkPathNaming(
			[
				{
					path: "src/handlers/invoice/index.ts",
					style: "camel",
					suffix: ".handler",
				},
			],
			cwd,
			[],
		);
		// index.ts doesn't end with .handler
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain('suffix ".handler"');
	});

	it("checks directory naming", async () => {
		const results = await checkPathNaming(
			[{ path: "src/*/", target: "directory", style: "kebab" }],
			cwd,
			[],
		);
		// handlers, components, hooks, domain, utils -> all lowercase, no hyphens needed for single words
		expect(results).toHaveLength(0);
	});
});
