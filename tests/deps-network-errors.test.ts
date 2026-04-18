import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
	type PackageInfo,
	type RegistryClient,
	RegistryLookupError,
} from "../src/registry/index.js";
import { checkDepsCrossEcosystem } from "../src/rules/deps/cross-ecosystem.js";
import { checkDepsExistence } from "../src/rules/deps/existence.js";
import { checkDepsFreshness } from "../src/rules/deps/freshness.js";
import { checkDepsPopularity } from "../src/rules/deps/popularity.js";
import type { DepsEcosystem } from "../src/types.js";

const cwd = resolve(import.meta.dirname, "fixtures/deps");

class FailingRegistry implements RegistryClient {
	async lookup(_name: string, _ecosystem: DepsEcosystem): Promise<PackageInfo> {
		throw new RegistryLookupError("network down");
	}
	async lookupAcross(_name: string): Promise<PackageInfo[]> {
		throw new RegistryLookupError("network down");
	}
}

class UnexpectedRegistry implements RegistryClient {
	async lookup(_name: string, _ecosystem: DepsEcosystem): Promise<PackageInfo> {
		throw new TypeError("programmer error");
	}
	async lookupAcross(_name: string): Promise<PackageInfo[]> {
		throw new TypeError("programmer error");
	}
}

describe("deps rules surface network failures as warn findings", () => {
	it("existence emits warn on RegistryLookupError", async () => {
		const results = await checkDepsExistence(
			[{ path: "package.json" }],
			cwd,
			[],
			new FailingRegistry(),
		);
		expect(results.length).toBeGreaterThan(0);
		expect(results.every((r) => r.severity === "warn")).toBe(true);
		expect(results[0].message).toContain("レジストリ照合に失敗しました");
	});

	it("freshness emits warn on RegistryLookupError", async () => {
		const results = await checkDepsFreshness(
			[{ path: "package.json" }],
			cwd,
			[],
			new FailingRegistry(),
		);
		expect(results.length).toBeGreaterThan(0);
		expect(results.every((r) => r.severity === "warn")).toBe(true);
		expect(results[0].message).toContain("鮮度照合に失敗しました");
	});

	it("popularity emits warn on RegistryLookupError", async () => {
		const results = await checkDepsPopularity(
			[{ path: "package.json" }],
			cwd,
			[],
			new FailingRegistry(),
		);
		expect(results.length).toBeGreaterThan(0);
		expect(results.every((r) => r.severity === "warn")).toBe(true);
		expect(results[0].message).toContain("人気度照合に失敗しました");
	});

	it("cross_ecosystem emits warn on RegistryLookupError", async () => {
		const results = await checkDepsCrossEcosystem(
			[{ path: "package.json" }],
			cwd,
			[],
			new FailingRegistry(),
		);
		expect(results.length).toBeGreaterThan(0);
		expect(results.every((r) => r.severity === "warn")).toBe(true);
		expect(results[0].message).toContain("エコシステム横断照合に失敗しました");
	});
});

describe("deps rules propagate non-network errors", () => {
	it("existence re-throws unexpected errors", async () => {
		await expect(
			checkDepsExistence(
				[{ path: "package.json" }],
				cwd,
				[],
				new UnexpectedRegistry(),
			),
		).rejects.toBeInstanceOf(TypeError);
	});

	it("freshness re-throws unexpected errors", async () => {
		await expect(
			checkDepsFreshness(
				[{ path: "package.json" }],
				cwd,
				[],
				new UnexpectedRegistry(),
			),
		).rejects.toBeInstanceOf(TypeError);
	});
});
