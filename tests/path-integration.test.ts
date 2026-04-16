import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { runPathRules } from "../src/rules/path/index.js";
import type { PathConfig } from "../src/types.js";

const cwd = resolve(import.meta.dirname, "fixtures/project");

describe("path command integration", () => {
	it("runs all rules and aggregates results", async () => {
		const config: PathConfig = {
			forbidden: [
				{
					path: "**/utils/**",
					message: "utils/ は使用禁止。",
				},
			],
			required: [
				{
					path: "src/handlers/invoice",
					files: ["index.ts", "schema.ts"],
				},
			],
			naming: [{ path: "src/components/**/*.tsx", style: "PascalCase" }],
			depth: [{ path: "src", max: 3 }],
		};

		const results = await runPathRules(config, cwd);
		expect(results).toHaveLength(5); // 5 rule categories (count has no config)

		const forbidden = results.find((r) => r.name === "forbidden");
		expect(forbidden?.results.length).toBeGreaterThan(0);

		const required = results.find((r) => r.name === "required");
		expect(required?.results.length).toBeGreaterThan(0);

		const naming = results.find((r) => r.name === "naming");
		expect(naming?.results.length).toBeGreaterThan(0);

		const depth = results.find((r) => r.name === "depth");
		expect(depth?.results.length).toBeGreaterThan(0);

		const count = results.find((r) => r.name === "count");
		expect(count?.results).toHaveLength(0);
	});

	it("filters by specific rule", async () => {
		const config: PathConfig = {
			forbidden: [{ path: "**/utils/**" }],
			naming: [{ path: "src/components/**/*.tsx", style: "PascalCase" }],
		};

		const results = await runPathRules(config, cwd, "forbidden");
		expect(results).toHaveLength(1);
		expect(results[0].name).toBe("forbidden");
	});

	it("returns empty results for passing config", async () => {
		const config: PathConfig = {
			forbidden: [{ path: "**/nonexistent/**" }],
		};

		const results = await runPathRules(config, cwd);
		const allViolations = results.flatMap((r) => r.results);
		expect(allViolations).toHaveLength(0);
	});
});
