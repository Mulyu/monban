import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { PackageInfo, RegistryClient } from "../src/registry/client.js";
import { checkDepsAllowed } from "../src/rules/deps/allowed.js";
import { checkDepsCrossEcosystem } from "../src/rules/deps/cross-ecosystem.js";
import { checkDepsDenied } from "../src/rules/deps/denied.js";
import { checkDepsExistence } from "../src/rules/deps/existence.js";
import { checkDepsFreshness } from "../src/rules/deps/freshness.js";
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

describe("deps/denied", () => {
	it("flags names that match the denylist", async () => {
		const results = await checkDepsDenied(
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
