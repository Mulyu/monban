import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkContentSize } from "../src/rules/content/size.js";

describe("content/size", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "monban-size-"));
		await mkdir(join(tempDir, "src"));
		await writeFile(
			join(tempDir, "src/small.ts"),
			Array.from({ length: 10 }, (_, i) => `const x${i} = ${i};`).join("\n"),
		);
		await writeFile(
			join(tempDir, "src/big.ts"),
			Array.from({ length: 50 }, (_, i) => `const x${i} = ${i};`).join("\n"),
		);
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true });
	});

	it("passes files within the line limit", async () => {
		const results = await checkContentSize(
			[{ path: "src/**/*.ts", max_lines: 100 }],
			tempDir,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("flags files exceeding the line limit", async () => {
		const results = await checkContentSize(
			[{ path: "src/**/*.ts", max_lines: 20 }],
			tempDir,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].path).toBe("src/big.ts");
		expect(results[0].message).toContain("50");
		expect(results[0].message).toContain("20");
		expect(results[0].severity).toBe("error");
	});

	it("uses custom severity", async () => {
		const results = await checkContentSize(
			[{ path: "src/**/*.ts", max_lines: 20, severity: "warn" }],
			tempDir,
			[],
		);
		expect(results[0].severity).toBe("warn");
	});

	it("respects exclude patterns", async () => {
		const results = await checkContentSize(
			[
				{
					path: "src/**/*.ts",
					max_lines: 20,
					exclude: ["src/big.ts"],
				},
			],
			tempDir,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("trims trailing newline before counting", async () => {
		await writeFile(join(tempDir, "src/trailing.ts"), "a\nb\nc\n");
		const results = await checkContentSize(
			[{ path: "src/trailing.ts", max_lines: 3 }],
			tempDir,
			[],
		);
		expect(results).toHaveLength(0);
	});
});
