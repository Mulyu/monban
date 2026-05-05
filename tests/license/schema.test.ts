import { describe, expect, it } from "vitest";
import { validateLicenseConfig } from "../../src/rules/license/schema.js";

describe("config/schema/license", () => {
	it("rejects non-object input", () => {
		expect(() => validateLicenseConfig("oops")).toThrow(/object/);
	});

	it("returns empty config when no rules are defined", () => {
		expect(validateLicenseConfig({})).toEqual({});
	});

	it("requires file rules to have a path", () => {
		expect(() =>
			validateLicenseConfig({ file: [{ allowed: ["MIT"] }] }),
		).toThrow(/path/);
	});

	it("rejects non-array file", () => {
		expect(() => validateLicenseConfig({ file: "LICENSE" })).toThrow(/array/);
	});

	it("rejects within_lines that is not a positive integer", () => {
		expect(() =>
			validateLicenseConfig({
				header: [{ path: "src/**/*.ts", within_lines: 0 }],
			}),
		).toThrow(/within_lines/);
	});

	it("accepts a fully specified configuration", () => {
		const config = validateLicenseConfig({
			file: [{ path: "LICENSE", allowed: ["MIT", "Apache-2.0"] }],
			header: [
				{
					path: "src/**/*.ts",
					exclude: ["src/legacy/**"],
					allowed: ["MIT"],
					within_lines: 5,
					severity: "warn",
					message: "missing header",
				},
			],
		});
		expect(config.file).toHaveLength(1);
		expect(config.header).toHaveLength(1);
		expect(config.header?.[0].within_lines).toBe(5);
		expect(config.header?.[0].severity).toBe("warn");
	});
});
