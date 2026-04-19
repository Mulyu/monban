import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkPathSize } from "../src/rules/path/size.js";

const cwd = resolve(import.meta.dirname, "fixtures/path-extras");

describe("path/size", () => {
	it("flags files exceeding max_bytes", async () => {
		const results = await checkPathSize(
			[{ path: "big-file/*.txt", max_bytes: 1024 }],
			cwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].path).toContain("large.txt");
		expect(results[0].message).toContain("KiB");
	});

	it("does not flag files within max_bytes", async () => {
		const results = await checkPathSize(
			[{ path: "big-file/small.txt", max_bytes: 1024 }],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("respects exclude", async () => {
		const results = await checkPathSize(
			[
				{
					path: "big-file/*.txt",
					exclude: ["big-file/large.txt"],
					max_bytes: 1024,
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("uses custom message and severity", async () => {
		const results = await checkPathSize(
			[
				{
					path: "big-file/large.txt",
					max_bytes: 1024,
					message: "ファイルが大きすぎ",
					severity: "warn",
				},
			],
			cwd,
			[],
		);
		expect(results[0].message).toBe("ファイルが大きすぎ");
		expect(results[0].severity).toBe("warn");
	});
});
