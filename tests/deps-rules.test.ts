import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { PackageInfo, RegistryClient } from "../src/registry/index.js";
import { checkDepsAllowed } from "../src/rules/deps/allowed.js";
import { checkDepsCrossEcosystem } from "../src/rules/deps/cross-ecosystem.js";
import { checkDepsExistence } from "../src/rules/deps/existence.js";
import { checkDepsFloatingVersion } from "../src/rules/deps/floating-version.js";
import { checkDepsForbidden } from "../src/rules/deps/forbidden.js";
import { checkDepsFreshness } from "../src/rules/deps/freshness.js";
import { checkDepsGitDependency } from "../src/rules/deps/git-dependency.js";
import { checkDepsInstallScripts } from "../src/rules/deps/install-scripts.js";
import { checkDepsPopularity } from "../src/rules/deps/popularity.js";
import { checkDepsTyposquat } from "../src/rules/deps/typosquat.js";
import type { DepsEcosystem } from "../src/types.js";

const cwd = resolve(import.meta.dirname, "fixtures/deps");

class MockRegistry implements RegistryClient {
	constructor(
		private readonly table: Record<string, Partial<PackageInfo>> = {},
	) {}

	async lookup(name: string, ecosystem: DepsEcosystem): Promise<PackageInfo> {
		const key = `${ecosystem}:${name}`;
		const found = this.table[key];
		if (!found) return { name, ecosystem, exists: false };
		return { name, ecosystem, exists: true, ...found };
	}

	async lookupAcross(name: string): Promise<PackageInfo[]> {
		const results: PackageInfo[] = [];
		for (const key of Object.keys(this.table)) {
			const [eco, n] = key.split(":");
			if (n === name) {
				results.push({
					name,
					ecosystem: eco as DepsEcosystem,
					exists: true,
					...this.table[key],
				});
			}
		}
		return results;
	}
}

describe("deps/existence", () => {
	it("flags packages not found in the registry", async () => {
		const reg = new MockRegistry({
			"npm:express": {},
			"npm:eslint": {},
		});
		const results = await checkDepsExistence(
			[{ path: "package.json" }],
			cwd,
			[],
			reg,
		);
		const names = results.map((r) => r.message.split(":")[0]);
		expect(names).toEqual(
			expect.arrayContaining([
				"ai-json-helper",
				"reqeusts",
				"brand-new-logger",
				"lodahs",
			]),
		);
		expect(names).not.toContain("express");
	});

	it("respects rule-level exclude list", async () => {
		const reg = new MockRegistry({ "npm:express": {}, "npm:eslint": {} });
		const results = await checkDepsExistence(
			[
				{
					path: "package.json",
					exclude: ["ai-*", "brand-*", "reqeusts", "lodahs"],
				},
			],
			cwd,
			[],
			reg,
		);
		expect(results).toHaveLength(0);
	});
});

describe("deps/freshness", () => {
	it("flags packages published within max_age_hours", async () => {
		const now = new Date("2026-04-18T12:00:00Z");
		const recent = new Date("2026-04-18T10:00:00Z").toISOString();
		const old = new Date("2025-01-01T00:00:00Z").toISOString();
		const reg = new MockRegistry({
			"npm:express": { publishedAt: old },
			"npm:ai-json-helper": { publishedAt: recent },
			"npm:reqeusts": { publishedAt: old },
			"npm:brand-new-logger": { publishedAt: recent },
			"npm:eslint": { publishedAt: old },
			"npm:lodahs": { publishedAt: old },
		});
		const results = await checkDepsFreshness(
			[{ path: "package.json", max_age_hours: 24 }],
			cwd,
			[],
			reg,
			now,
		);
		const msgs = results.map((r) => r.message);
		expect(msgs.some((m) => m.includes("ai-json-helper"))).toBe(true);
		expect(msgs.some((m) => m.includes("brand-new-logger"))).toBe(true);
		expect(msgs.some((m) => m.includes("express"))).toBe(false);
	});
});

describe("deps/popularity", () => {
	it("flags packages below min_downloads", async () => {
		const reg = new MockRegistry({
			"npm:express": { downloads: 1_000_000 },
			"npm:ai-json-helper": { downloads: 5 },
			"npm:reqeusts": { downloads: 10_000 },
			"npm:brand-new-logger": { downloads: 2 },
			"npm:eslint": { downloads: 500_000 },
			"npm:lodahs": { downloads: 3 },
		});
		const results = await checkDepsPopularity(
			[{ path: "package.json", min_downloads: 100 }],
			cwd,
			[],
			reg,
		);
		const low = results.map((r) => r.message);
		expect(low.some((m) => m.includes("ai-json-helper"))).toBe(true);
		expect(low.some((m) => m.includes("brand-new-logger"))).toBe(true);
		expect(low.some((m) => m.includes("express"))).toBe(false);
	});
});

describe("deps/cross_ecosystem", () => {
	it("flags npm deps that exist only on another ecosystem", async () => {
		const reg = new MockRegistry({
			"pypi:reqeusts": {},
			"npm:express": {},
			"npm:eslint": {},
		});
		const results = await checkDepsCrossEcosystem(
			[{ path: "package.json" }],
			cwd,
			[],
			reg,
		);
		const msgs = results.map((r) => r.message);
		expect(msgs.some((m) => m.includes("reqeusts") && m.includes("pypi"))).toBe(
			true,
		);
	});
});

describe("deps/typosquat", () => {
	it("flags names within edit distance of a popular package", async () => {
		const results = await checkDepsTyposquat(
			[{ path: "package.json", max_distance: 2 }],
			cwd,
			[],
		);
		const msgs = results.map((r) => r.message);
		expect(msgs.some((m) => m.includes("lodahs") && m.includes("lodash"))).toBe(
			true,
		);
	});
});

describe("deps/allowed", () => {
	it("rejects names not in the allowlist (supports globs)", async () => {
		const results = await checkDepsAllowed(
			[
				{
					path: "package.json",
					names: ["express", "eslint", "@myorg/*"],
				},
			],
			cwd,
			[],
		);
		const bad = results.map((r) => r.message);
		expect(bad.some((m) => m.startsWith("ai-json-helper"))).toBe(true);
		expect(bad.some((m) => m.startsWith("express"))).toBe(false);
		expect(bad.some((m) => m.startsWith("eslint"))).toBe(false);
	});
});

describe("deps/forbidden", () => {
	it("flags names that match the forbidden list", async () => {
		const results = await checkDepsForbidden(
			[
				{
					path: "package.json",
					names: ["ai-*", "reqeusts"],
					message: "hallucinated dep",
				},
			],
			cwd,
			[],
		);
		expect(results.length).toBeGreaterThanOrEqual(2);
		expect(results.every((r) => r.message.includes("hallucinated dep"))).toBe(
			true,
		);
	});
});

const scriptsCwd = resolve(import.meta.dirname, "fixtures/deps-scripts");
const sourcesCwd = resolve(import.meta.dirname, "fixtures/deps-sources");
const floatingCwd = resolve(import.meta.dirname, "fixtures/deps-floating");

describe("deps/install_scripts", () => {
	it("detects lifecycle hooks in package.json", async () => {
		const results = await checkDepsInstallScripts(
			[{ path: "package.json" }],
			scriptsCwd,
			[],
		);
		const hooks = results.map((r) => r.message);
		expect(hooks.some((m) => m.includes("preinstall"))).toBe(true);
		expect(hooks.some((m) => m.includes("postinstall"))).toBe(true);
		expect(hooks.some((m) => m.includes("prepare"))).toBe(true);
		// `test` is not a lifecycle hook
		expect(hooks.some((m) => m.includes("test"))).toBe(false);
	});

	it("does not flag manifests without lifecycle hooks", async () => {
		const results = await checkDepsInstallScripts(
			[{ path: "package.json" }],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("respects forbidden filter", async () => {
		const results = await checkDepsInstallScripts(
			[{ path: "package.json", forbidden: ["preinstall"] }],
			scriptsCwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("preinstall");
	});

	it("defaults to warn severity", async () => {
		const results = await checkDepsInstallScripts(
			[{ path: "package.json" }],
			scriptsCwd,
			[],
		);
		expect(results[0].severity).toBe("warn");
	});
});

describe("deps/git_dependency", () => {
	it("flags git / file / URL sources", async () => {
		const results = await checkDepsGitDependency(
			[{ path: "package.json" }],
			sourcesCwd,
			[],
		);
		const names = results.map((r) => r.message.split(":")[0]);
		expect(names).toContain("my-fork");
		expect(names).toContain("ssh-dep");
		expect(names).toContain("local-lib");
		expect(names).toContain("gh-short");
		expect(names).toContain("url-tgz");
	});

	it("does not flag registry-version dependencies", async () => {
		const results = await checkDepsGitDependency(
			[{ path: "package.json" }],
			sourcesCwd,
			[],
		);
		const names = results.map((r) => r.message.split(":")[0]);
		expect(names).not.toContain("express");
	});

	it("respects per-rule exclude", async () => {
		const results = await checkDepsGitDependency(
			[{ path: "package.json", exclude: ["package.json"] }],
			sourcesCwd,
			[],
		);
		expect(results).toHaveLength(0);
	});
});

describe("deps/floating_version", () => {
	it("flags caret / tilde / star / latest / x-range / unbounded", async () => {
		const results = await checkDepsFloatingVersion(
			[{ path: "package.json" }],
			floatingCwd,
			[],
		);
		const names = results.map((r) => r.message.split(":")[0]);
		expect(names).toContain("caret");
		expect(names).toContain("tilde");
		expect(names).toContain("star");
		expect(names).toContain("latest");
		expect(names).toContain("xrange");
		expect(names).toContain("unbounded");
	});

	it("does not flag pinned exact versions", async () => {
		const results = await checkDepsFloatingVersion(
			[{ path: "package.json" }],
			floatingCwd,
			[],
		);
		const names = results.map((r) => r.message.split(":")[0]);
		expect(names).not.toContain("pinned");
	});

	it("respects the allowed list (glob)", async () => {
		const results = await checkDepsFloatingVersion(
			[{ path: "package.json", allowed: ["caret", "latest"] }],
			floatingCwd,
			[],
		);
		const names = results.map((r) => r.message.split(":")[0]);
		expect(names).not.toContain("caret");
		expect(names).not.toContain("latest");
		// still flags others
		expect(names).toContain("tilde");
	});
});
