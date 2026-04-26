import { describe, expect, it } from "vitest";
import { validateRuntimeConfig } from "../src/config/schema/runtime.js";
import { RUNTIME_PRESETS } from "../src/rules/runtime/presets.js";

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

	describe("preset", () => {
		it("expands a preset into its built-in sources", () => {
			const config = validateRuntimeConfig({
				consistency: [{ preset: "node" }],
			});
			const rule = config.consistency?.[0];
			expect(rule?.name).toBe("node");
			expect(rule?.sources).toEqual(RUNTIME_PRESETS.node);
		});

		it("rejects unknown preset names", () => {
			expect(() =>
				validateRuntimeConfig({
					consistency: [{ preset: "haskell" }],
				}),
			).toThrow(/preset must be one of/);
		});

		it("requires either name or preset", () => {
			expect(() =>
				validateRuntimeConfig({
					consistency: [{ sources: [{ path: ".nvmrc" }] }],
				}),
			).toThrow(/name.*preset/);
		});

		it("appends user sources to the preset's sources", () => {
			const config = validateRuntimeConfig({
				consistency: [
					{
						preset: "node",
						sources: [{ path: "infra/k8s/*.yaml", pattern: "node:([\\d.]+)" }],
					},
				],
			});
			const rule = config.consistency?.[0];
			expect(rule?.sources.length).toBe(RUNTIME_PRESETS.node.length + 1);
			expect(rule?.sources.slice(0, RUNTIME_PRESETS.node.length)).toEqual(
				RUNTIME_PRESETS.node,
			);
			expect(rule?.sources[rule.sources.length - 1].path).toBe(
				"infra/k8s/*.yaml",
			);
		});

		it("lets an explicit name override the preset name", () => {
			const config = validateRuntimeConfig({
				consistency: [{ preset: "node", name: "node-edge" }],
			});
			expect(config.consistency?.[0].name).toBe("node-edge");
		});

		it("preserves severity and message when preset is used", () => {
			const config = validateRuntimeConfig({
				consistency: [
					{ preset: "python", severity: "warn", message: "mismatch" },
				],
			});
			expect(config.consistency?.[0].severity).toBe("warn");
			expect(config.consistency?.[0].message).toBe("mismatch");
		});
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
