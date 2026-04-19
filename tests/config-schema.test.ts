import { describe, expect, it } from "vitest";
import { validateContentConfig } from "../src/config/schema/content.js";
import { validateDepsConfig } from "../src/config/schema/deps.js";
import { validateDocConfig } from "../src/config/schema/doc.js";
import { validateGitConfig } from "../src/config/schema/git.js";
import { validateGithubConfig } from "../src/config/schema/github.js";
import { validateConfig } from "../src/config/schema/index.js";
import { validatePathConfig } from "../src/config/schema/path.js";

describe("config/schema top-level", () => {
	it("returns empty config for null/undefined", () => {
		expect(validateConfig(null)).toEqual({});
		expect(validateConfig(undefined)).toEqual({});
	});

	it("rejects non-object top-level", () => {
		expect(() => validateConfig("oops")).toThrow(/YAML object/);
	});

	it("defaults exclude to an empty array", () => {
		expect(validateConfig({}).exclude).toEqual([]);
	});

	it("parses exclude as string array", () => {
		expect(validateConfig({ exclude: ["**/node_modules/**"] }).exclude).toEqual(
			["**/node_modules/**"],
		);
	});
});

describe("config/schema/path", () => {
	it("rejects non-object", () => {
		expect(() => validatePathConfig("x")).toThrow(/object/);
	});

	it("requires forbidden rules to have path", () => {
		expect(() =>
			validatePathConfig({ forbidden: [{ message: "no path" }] }),
		).toThrow(/path/);
	});

	it("requires either files or companions on required rule", () => {
		expect(() => validatePathConfig({ required: [{ path: "src/" }] })).toThrow(
			/files.*companions/,
		);
	});

	it("accepts companions with root flag", () => {
		const config = validatePathConfig({
			required: [
				{
					path: "src/**/*.ts",
					companions: [{ pattern: "{stem}.test.ts", root: true }],
				},
			],
		});
		expect(config.required?.[0].companions?.[0].root).toBe(true);
	});

	it("rejects unknown naming style", () => {
		expect(() =>
			validatePathConfig({
				naming: [{ path: "src/**/*.ts", style: "dromedary" }],
			}),
		).toThrow(/style/);
	});

	it("rejects invalid target", () => {
		expect(() =>
			validatePathConfig({
				naming: [{ path: "src/**/*.ts", style: "camel", target: "blob" }],
			}),
		).toThrow(/target/);
	});

	it("requires integer max on depth and count", () => {
		expect(() =>
			validatePathConfig({ depth: [{ path: "src", max: 1.5 }] }),
		).toThrow(/integer/);
		expect(() =>
			validatePathConfig({ count: [{ path: "src", max: "x" }] }),
		).toThrow(/integer/);
	});
});

describe("config/schema/content", () => {
	it("requires at least one of pattern/bom/invisible/secret on forbidden", () => {
		expect(() =>
			validateContentConfig({ forbidden: [{ path: "**/*.ts" }] }),
		).toThrow(/pattern.*bom.*invisible.*secret/);
	});

	it("accepts pattern-only forbidden rule", () => {
		const config = validateContentConfig({
			forbidden: [{ path: "**/*.ts", pattern: "foo" }],
		});
		expect(config.forbidden?.[0].pattern).toBe("foo");
	});

	it("rejects boolean coercions for bom/invisible/secret", () => {
		expect(() =>
			validateContentConfig({ forbidden: [{ path: "x", bom: "yes" }] }),
		).toThrow(/bom/);
	});

	it("requires pattern on required rule", () => {
		expect(() =>
			validateContentConfig({ required: [{ path: "**/*.ts" }] }),
		).toThrow(/pattern/);
	});

	it("rejects unknown scope on required", () => {
		expect(() =>
			validateContentConfig({
				required: [{ path: "**/*.ts", pattern: "x", scope: "bogus" }],
			}),
		).toThrow(/scope/);
	});

	it("requires max_lines on size rule", () => {
		expect(() =>
			validateContentConfig({ size: [{ path: "**/*.ts" }] }),
		).toThrow(/max_lines/);
	});
});

describe("config/schema/doc", () => {
	it("rejects non-object", () => {
		expect(() => validateDocConfig("x")).toThrow(/object/);
	});

	it("requires path on ref and link rules", () => {
		expect(() => validateDocConfig({ ref: [{}] })).toThrow(/path/);
		expect(() => validateDocConfig({ link: [{}] })).toThrow(/path/);
	});

	it("accepts minimal ref and link rules", () => {
		const config = validateDocConfig({
			ref: [{ path: "**/*.md" }],
			link: [{ path: "**/*.md" }],
		});
		expect(config.ref?.[0].path).toBe("**/*.md");
		expect(config.link?.[0].path).toBe("**/*.md");
	});
});

describe("config/schema/deps", () => {
	it("rejects non-object", () => {
		expect(() => validateDepsConfig("x")).toThrow(/object/);
	});

	it("requires positive max_age_hours on freshness", () => {
		expect(() =>
			validateDepsConfig({
				freshness: [{ path: "package.json", max_age_hours: -1 }],
			}),
		).toThrow(/max_age_hours/);
	});

	it("requires positive integer min_downloads on popularity", () => {
		expect(() =>
			validateDepsConfig({
				popularity: [{ path: "package.json", min_downloads: 0 }],
			}),
		).toThrow(/min_downloads/);
	});

	it("requires non-empty names on allowed/forbidden", () => {
		expect(() =>
			validateDepsConfig({ allowed: [{ path: "package.json", names: [] }] }),
		).toThrow(/names/);
		expect(() =>
			validateDepsConfig({ forbidden: [{ path: "package.json", names: [] }] }),
		).toThrow(/names/);
	});
});

describe("config/schema/github", () => {
	it("rejects non-object", () => {
		expect(() => validateGithubConfig("x")).toThrow(/object/);
	});

	it("requires path and uses on forbidden", () => {
		expect(() =>
			validateGithubConfig({
				actions: { forbidden: [{ path: ".github/workflows/*.yml" }] },
			}),
		).toThrow(/uses/);
	});

	it("accepts either file OR path+steps on required", () => {
		expect(() => validateGithubConfig({ actions: { required: [{}] } })).toThrow(
			/file.*path.*steps/,
		);
		const withFile = validateGithubConfig({
			actions: { required: [{ file: ".github/workflows/ci.yml" }] },
		});
		expect(withFile.actions?.required?.[0].file).toBe(
			".github/workflows/ci.yml",
		);
		const withSteps = validateGithubConfig({
			actions: {
				required: [
					{
						path: ".github/workflows/ci.yml",
						steps: ["actions/checkout"],
					},
				],
			},
		});
		expect(withSteps.actions?.required?.[0].steps).toEqual([
			"actions/checkout",
		]);
	});

	it("rejects unknown pinned target", () => {
		expect(() =>
			validateGithubConfig({
				actions: {
					pinned: [{ path: ".github/workflows/*.yml", targets: ["oci"] }],
				},
			}),
		).toThrow(/targets/);
	});

	it("requires allowed or forbidden on triggers", () => {
		expect(() =>
			validateGithubConfig({
				actions: { triggers: [{ path: ".github/workflows/*.yml" }] },
			}),
		).toThrow(/allowed.*forbidden/);
	});

	it("requires non-empty runner.allowed", () => {
		expect(() =>
			validateGithubConfig({
				actions: {
					runner: [{ path: ".github/workflows/*.yml", allowed: [] }],
				},
			}),
		).toThrow(/allowed/);
	});

	it("requires positive integer timeout.max", () => {
		expect(() =>
			validateGithubConfig({
				actions: {
					timeout: [{ path: ".github/workflows/*.yml", max: 0 }],
				},
			}),
		).toThrow(/max/);
	});

	it("requires non-empty owners on codeowners.ownership", () => {
		expect(() =>
			validateGithubConfig({
				codeowners: { ownership: [{ path: "src/**", owners: [] }] },
			}),
		).toThrow(/owners/);
	});
});

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
					forbidden: [{ key: "Co-authored-by", value_pattern: "Claude" }],
					required: [{ key: "Signed-off-by" }],
					allowed: [{ key: "AI-Assistant" }],
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
					allowed: [".vscode/settings.json"],
					severity: "warn",
				},
			},
		};
		const config = validateGitConfig(raw);
		expect(config.commit?.message?.preset).toBe("conventional");
		expect(config.commit?.trailers?.forbidden).toHaveLength(1);
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

	it("rejects invalid diff.ignored scope", () => {
		expect(() =>
			validateGitConfig({ diff: { ignored: { scope: "other" } } }),
		).toThrow(/scope/);
	});

	it("rejects negative body_min_length", () => {
		expect(() =>
			validateGitConfig({ commit: { message: { body_min_length: -1 } } }),
		).toThrow(/non-negative/);
	});

	it("requires key on trailer forbidden entries", () => {
		expect(() =>
			validateGitConfig({ commit: { trailers: { forbidden: [{}] } } }),
		).toThrow(/key/);
	});

	it("rejects non-object top-level", () => {
		expect(() => validateGitConfig("invalid")).toThrow(/object/);
	});
});
