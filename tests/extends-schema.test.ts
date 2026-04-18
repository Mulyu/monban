import { describe, expect, it } from "vitest";
import { validateConfig } from "../src/config/schema/index.js";

describe("extends/schema", () => {
	it("validates local extends", () => {
		const config = validateConfig({
			extends: [{ type: "local", path: "./base.yml" }],
		});
		expect(config.extends).toEqual([{ type: "local", path: "./base.yml" }]);
	});

	it("validates github extends with ref", () => {
		const config = validateConfig({
			extends: [
				{
					type: "github",
					repo: "myorg/monban-standards",
					ref: "main",
					path: "base.yml",
				},
			],
		});
		expect(config.extends?.[0]).toEqual({
			type: "github",
			repo: "myorg/monban-standards",
			ref: "main",
			path: "base.yml",
		});
	});

	it("validates github extends without ref", () => {
		const config = validateConfig({
			extends: [
				{
					type: "github",
					repo: "myorg/monban-standards",
					path: "base.yml",
				},
			],
		});
		expect(config.extends?.[0]).toEqual({
			type: "github",
			repo: "myorg/monban-standards",
			path: "base.yml",
		});
	});

	it("rejects unknown type", () => {
		expect(() =>
			validateConfig({
				extends: [{ type: "invalid", path: "./foo.yml" }],
			}),
		).toThrow('type must be "local" or "github"');
	});

	it("rejects local without path", () => {
		expect(() =>
			validateConfig({
				extends: [{ type: "local" }],
			}),
		).toThrow();
	});

	it("rejects github without repo", () => {
		expect(() =>
			validateConfig({
				extends: [{ type: "github", path: "base.yml" }],
			}),
		).toThrow();
	});

	it("rejects non-array extends", () => {
		expect(() =>
			validateConfig({
				extends: { type: "local", path: "./foo.yml" },
			}),
		).toThrow();
	});
});
