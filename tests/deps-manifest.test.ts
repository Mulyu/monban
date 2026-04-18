import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadManifest } from "../src/manifest/index.js";

const cwd = resolve(import.meta.dirname, "fixtures/deps");

describe("manifest parsers", () => {
	it("parses package.json across dependency fields", async () => {
		const m = await loadManifest("package.json", cwd);
		expect(m?.ecosystem).toBe("npm");
		const names = m?.entries.map((e) => e.name) ?? [];
		expect(names).toContain("express");
		expect(names).toContain("ai-json-helper");
		expect(names).toContain("eslint");
	});

	it("parses requirements.txt and skips -r/-e lines", async () => {
		const m = await loadManifest("requirements.txt", cwd);
		expect(m?.ecosystem).toBe("pypi");
		const names = m?.entries.map((e) => e.name) ?? [];
		expect(names).toEqual(["requests", "numpy", "ai-helper-x"]);
	});

	it("parses Gemfile gem entries", async () => {
		const m = await loadManifest("Gemfile", cwd);
		expect(m?.ecosystem).toBe("rubygems");
		const names = m?.entries.map((e) => e.name) ?? [];
		expect(names).toEqual(["rails", "rspec", "nokogiri"]);
	});

	it("parses go.mod require blocks and single-line require", async () => {
		const m = await loadManifest("go.mod", cwd);
		expect(m?.ecosystem).toBe("go");
		const names = m?.entries.map((e) => e.name) ?? [];
		expect(names).toContain("github.com/spf13/cobra");
		expect(names).toContain("github.com/stretchr/testify");
		expect(names).toContain("github.com/foo/bar");
	});

	it("parses Cargo.toml across dep tables", async () => {
		const m = await loadManifest("Cargo.toml", cwd);
		expect(m?.ecosystem).toBe("cargo");
		const names = m?.entries.map((e) => e.name) ?? [];
		expect(names).toEqual(
			expect.arrayContaining(["serde", "tokio", "mockall"]),
		);
	});

	it("parses pyproject.toml (PEP 621 + Poetry)", async () => {
		const m = await loadManifest("pyproject.toml", cwd);
		expect(m?.ecosystem).toBe("pypi");
		const names = m?.entries.map((e) => e.name) ?? [];
		expect(names).toEqual(
			expect.arrayContaining(["flask", "pydantic", "httpx"]),
		);
		expect(names).not.toContain("python");
	});

	it("parses GitHub workflow uses (skips local/docker)", async () => {
		const m = await loadManifest(".github/workflows/test.yml", cwd);
		expect(m?.ecosystem).toBe("github-actions");
		const names = m?.entries.map((e) => e.name) ?? [];
		expect(names).toEqual([
			"actions/checkout",
			"actions/setup-node",
			"evil/squatter",
		]);
	});
});
