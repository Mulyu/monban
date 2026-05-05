import { describe, expect, it } from "vitest";
import { validateDockerConfig } from "../src/rules/docker/schema.js";

describe("config/schema/docker", () => {
	it("rejects non-object input", () => {
		expect(() => validateDockerConfig("oops")).toThrow(/object/);
	});

	it("returns empty config when no rules are defined", () => {
		expect(validateDockerConfig({})).toEqual({});
	});

	it("requires forbidden.instructions to be a non-empty array", () => {
		expect(() =>
			validateDockerConfig({
				forbidden: [{ path: "Dockerfile", instructions: [] }],
			}),
		).toThrow(/instructions/);
	});

	it("requires instruction.name to be uppercase", () => {
		expect(() =>
			validateDockerConfig({
				forbidden: [{ path: "Dockerfile", instructions: [{ name: "add" }] }],
			}),
		).toThrow(/uppercase/);
	});

	it("rejects digest that is not a boolean", () => {
		expect(() =>
			validateDockerConfig({
				pinned: [{ path: "Dockerfile", digest: "yes" }],
			}),
		).toThrow(/digest/);
	});

	it("accepts a fully specified configuration", () => {
		const config = validateDockerConfig({
			pinned: [{ path: "Dockerfile", digest: true, severity: "warn" }],
			user: [{ path: "Dockerfile", required: true, forbidden: ["root", "0"] }],
			healthcheck: [{ path: "Dockerfile", required: true }],
			forbidden: [
				{
					path: "Dockerfile",
					instructions: [
						{ name: "ADD", pattern: "^https?://", message: "no remote ADD" },
					],
				},
			],
		});
		expect(config.pinned?.[0].digest).toBe(true);
		expect(config.user?.[0].forbidden).toEqual(["root", "0"]);
		expect(config.forbidden?.[0].instructions[0].pattern).toBe("^https?://");
	});
});
