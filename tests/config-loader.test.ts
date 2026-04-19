import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/loader.js";

describe("config/loadConfig", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "monban-loader-"));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true });
	});

	it("loads monban.yml when present", async () => {
		await writeFile(
			join(dir, "monban.yml"),
			"path:\n  forbidden:\n    - path: '**/utils/**'\n",
		);
		const config = await loadConfig(dir);
		expect(config.path?.forbidden?.[0].path).toBe("**/utils/**");
	});

	it("falls back to monban.yaml when monban.yml is absent", async () => {
		await writeFile(
			join(dir, "monban.yaml"),
			"content:\n  size:\n    - path: '**/*.ts'\n      max_lines: 100\n",
		);
		const config = await loadConfig(dir);
		expect(config.content?.size?.[0].max_lines).toBe(100);
	});

	it("throws a helpful message when no config file exists", async () => {
		await expect(loadConfig(dir)).rejects.toThrow(/monban\.yml not found/);
	});

	it("applies extends before schema validation", async () => {
		await writeFile(
			join(dir, "base.yml"),
			"path:\n  forbidden:\n    - path: '**/base/**'\n",
		);
		await writeFile(
			join(dir, "monban.yml"),
			[
				"extends:",
				"  - type: local",
				"    path: ./base.yml",
				"path:",
				"  forbidden:",
				"    - path: '**/child/**'",
				"",
			].join("\n"),
		);
		const config = await loadConfig(dir);
		expect(config.path?.forbidden?.map((r) => r.path)).toEqual([
			"**/base/**",
			"**/child/**",
		]);
	});

	it("propagates schema errors", async () => {
		await writeFile(
			join(dir, "monban.yml"),
			"path:\n  forbidden:\n    - message: 'no path here'\n",
		);
		await expect(loadConfig(dir)).rejects.toThrow(/path/);
	});
});
