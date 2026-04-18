import { describe, expect, it } from "vitest";
import { validateGitConfig } from "../src/config/schema/git.js";

describe("config/schema/git", () => {
	it("accepts empty config", () => {
		expect(validateGitConfig({})).toEqual({});
	});

	it("accepts full config", () => {
		const raw = {
			commit: {
				message: {
					preset: "conventional",
					subject_max_length: 72,
					forbidden_subjects: ["fix", "update"],
					ignore_merges: true,
					severity: "error",
				},
				trailers: {
					deny: [{ key: "Co-authored-by", value_pattern: "Claude" }],
					require: [{ key: "Signed-off-by" }],
					allow: [{ key: "AI-Assistant" }],
					severity: "error",
				},
				references: {
					required: true,
					patterns: ["#\\d+", "PROJ-\\d+"],
					scope: "any",
					ignore_patterns: ["^chore\\(deps\\):"],
					ignore_merges: true,
					severity: "error",
				},
			},
			diff: {
				size: {
					max_files: 30,
					max_total_lines: 1500,
					exclude: ["**/*.lock"],
					severity: "warn",
				},
				ignored: {
					scope: "diff",
					allow: [".vscode/settings.json"],
					severity: "warn",
				},
			},
		};
		const config = validateGitConfig(raw);
		expect(config.commit?.message?.preset).toBe("conventional");
		expect(config.commit?.trailers?.deny).toHaveLength(1);
		expect(config.commit?.references?.scope).toBe("any");
		expect(config.commit?.references?.patterns).toEqual(["#\\d+", "PROJ-\\d+"]);
		expect(config.diff?.size?.max_total_lines).toBe(1500);
		expect(config.diff?.ignored?.scope).toBe("diff");
	});

	it("rejects invalid references scope", () => {
		expect(() =>
			validateGitConfig({ commit: { references: { scope: "each" } } }),
		).toThrow(/scope/);
	});

	it("rejects invalid preset", () => {
		expect(() =>
			validateGitConfig({ commit: { message: { preset: "angular" } } }),
		).toThrow(/preset/);
	});

	it("rejects invalid scope", () => {
		expect(() =>
			validateGitConfig({ diff: { ignored: { scope: "other" } } }),
		).toThrow(/scope/);
	});

	it("rejects negative body_min_length", () => {
		expect(() =>
			validateGitConfig({ commit: { message: { body_min_length: -1 } } }),
		).toThrow(/non-negative/);
	});

	it("requires key on deny entries", () => {
		expect(() =>
			validateGitConfig({ commit: { trailers: { deny: [{}] } } }),
		).toThrow(/key/);
	});

	it("rejects non-object top-level", () => {
		expect(() => validateGitConfig("invalid")).toThrow(/object/);
	});
});
