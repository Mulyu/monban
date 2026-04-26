import { describe, expect, it } from "vitest";
import { validateRuntimeConfig } from "../src/config/schema/runtime.js";

describe("config/schema/runtime", () => {
	it("rejects non-object input", () => {
		expect(() => validateRuntimeConfig("oops")).toThrow(/object/);
	});

	it("returns empty config when no rules are defined", () => {
		expect(validateRuntimeConfig({})).toEqual({});
	});

	it("requires consistency rules to have a name", () => {
		expect(() =>
			validateRuntimeConfig({
				consistency: [{ sources: [{ path: ".nvmrc" }] }],
			}),
		).toThrow(/name/);
	});

	it("requires sources to be a non-empty array", () => {
		expect(() =>
			validateRuntimeConfig({
				consistency: [{ name: "node", sources: [] }],
			}),
		).toThrow(/sources/);
	});

	it("rejects sources mixing pattern and json_key", () => {
		expect(() =>
			validateRuntimeConfig({
				consistency: [
					{
						name: "node",
						sources: [
							{
								path: "package.json",
								pattern: "x",
								json_key: "engines.node",
							},
						],
					},
				],
			}),
		).toThrow(/at most one/);
	});

	it("accepts a fully specified rule", () => {
		const config = validateRuntimeConfig({
			consistency: [
				{
					name: "node",
					sources: [
						{ path: ".nvmrc" },
						{ path: "package.json", json_key: "engines.node" },
						{ path: "Dockerfile", pattern: "^FROM node:(\\d+)" },
						{
							path: ".github/workflows/*.yml",
							yaml_key: "jobs.*.steps.*.with.node-version",
						},
					],
					message: "node versions disagree",
					severity: "warn",
				},
			],
		});
		expect(config.consistency).toHaveLength(1);
		expect(config.consistency?.[0].sources).toHaveLength(4);
		expect(config.consistency?.[0].severity).toBe("warn");
	});
});
