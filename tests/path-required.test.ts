import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkPathRequired } from "../src/rules/path/required.js";

const cwd = resolve(import.meta.dirname, "fixtures/project");

describe("path/required - files mode", () => {
	it("passes when required files exist", async () => {
		const results = await checkPathRequired(
			[{ path: "src/handlers/invoice", files: ["index.ts"] }],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("detects missing required files", async () => {
		const results = await checkPathRequired(
			[{ path: "src/handlers/invoice", files: ["index.ts", "schema.ts"] }],
			cwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].rule).toBe("required");
		expect(results[0].message).toContain("schema.ts");
		expect(results[0].severity).toBe("error");
	});
});

describe("path/required - companions mode", () => {
	it("detects missing companion files", async () => {
		const results = await checkPathRequired(
			[
				{
					path: "src/components/**/*.tsx",
					exclude: ["**/*.test.tsx"],
					companions: [{ pattern: "{stem}.test.tsx", required: true }],
				},
			],
			cwd,
			[],
		);
		// UserProfile.tsx has UserProfile.test.tsx -> pass
		// user_card.tsx has no user_card.test.tsx -> fail
		expect(results).toHaveLength(1);
		expect(results[0].path).toContain("user_card.tsx");
		expect(results[0].message).toContain("user_card.test.tsx");
	});

	it("uses warn severity for non-required companions", async () => {
		const results = await checkPathRequired(
			[
				{
					path: "src/components/**/*.tsx",
					exclude: ["**/*.test.tsx"],
					companions: [{ pattern: "{stem}.stories.tsx", required: false }],
				},
			],
			cwd,
			[],
		);
		expect(results.length).toBeGreaterThan(0);
		for (const r of results) {
			expect(r.severity).toBe("warn");
		}
	});

	it("resolves companion paths relative to source dir by default", async () => {
		const results = await checkPathRequired(
			[
				{
					path: "src/components/UserProfile.tsx",
					companions: [{ pattern: "{stem}.test.tsx", required: true }],
				},
			],
			cwd,
			[],
		);
		// UserProfile.test.tsx exists in the same dir → pass
		expect(results).toHaveLength(0);
	});

	it("resolves companion paths from repository root when root: true", async () => {
		const results = await checkPathRequired(
			[
				{
					path: "src/components/UserProfile.tsx",
					companions: [
						{
							pattern: "docs/components/{stem}.md",
							required: true,
							root: true,
						},
					],
				},
			],
			cwd,
			[],
		);
		// docs/components/UserProfile.md does NOT exist in the fixture → fail
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("docs/components/UserProfile.md");
	});
});
