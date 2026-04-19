import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { resolveExtends } from "../src/config/extends/index.js";
import { validateConfig } from "../src/config/schema/index.js";

const fixtureDir = resolve(import.meta.dirname, "fixtures/extends");

describe("extends/local", () => {
	it("resolves local extends and merges arrays", async () => {
		const content = await readFile(resolve(fixtureDir, "child.yml"), "utf-8");
		const raw = parse(content);
		const merged = await resolveExtends(raw, fixtureDir);
		const config = validateConfig(merged);

		expect(config.exclude).toEqual(["**/node_modules/**", "**/dist/**"]);
		expect(config.path?.forbidden).toHaveLength(2);
		expect(config.path?.forbidden?.[0].path).toBe("**/utils/**");
		expect(config.path?.forbidden?.[1].path).toBe("**/helpers/**");
	});

	it("throws when local file not found", async () => {
		const raw = {
			extends: [{ type: "local", path: "./nonexistent.yml" }],
		};
		await expect(resolveExtends(raw, fixtureDir)).rejects.toThrow(
			"local file not found",
		);
	});

	it.each([
		["missing extends field", { path: { forbidden: [{ path: "a" }] } }],
		[
			"empty extends array",
			{ extends: [], path: { forbidden: [{ path: "a" }] } },
		],
	])("passes through when %s", async (_label, raw) => {
		const result = await resolveExtends(raw, fixtureDir);
		expect(result).toEqual(raw);
	});

	it("strips extends from merged result", async () => {
		const content = await readFile(resolve(fixtureDir, "child.yml"), "utf-8");
		const raw = parse(content);
		const merged = (await resolveExtends(raw, fixtureDir)) as Record<
			string,
			unknown
		>;
		expect(merged.extends).toBeUndefined();
	});
});
