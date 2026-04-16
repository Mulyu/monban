import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkCount } from "../src/rules/path/count.js";

describe("path/count", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "monban-count-"));
		await mkdir(join(tempDir, "handlers"));
		// Create 5 files
		for (let i = 1; i <= 5; i++) {
			await writeFile(join(tempDir, "handlers", `h${i}.ts`), "");
		}
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true });
	});

	it("passes when within limit", async () => {
		const results = await checkCount([{ path: "handlers", max: 10 }], tempDir);
		expect(results).toHaveLength(0);
	});

	it("detects count exceeding max", async () => {
		const results = await checkCount([{ path: "handlers", max: 3 }], tempDir);
		expect(results).toHaveLength(1);
		expect(results[0].severity).toBe("error");
		expect(results[0].message).toContain("5");
		expect(results[0].message).toContain("3");
	});

	it("warns when approaching limit", async () => {
		// 5 files, max 6 -> 83% > 80% warn threshold
		const results = await checkCount([{ path: "handlers", max: 6 }], tempDir);
		expect(results).toHaveLength(1);
		expect(results[0].severity).toBe("warn");
		expect(results[0].message).toContain("83%");
	});

	it("excludes specified files from count", async () => {
		await writeFile(join(tempDir, "handlers", "index.ts"), "");
		// 6 files total, but exclude index.ts -> 5 counted
		const results = await checkCount(
			[{ path: "handlers", max: 5, exclude: ["index.ts"] }],
			tempDir,
		);
		// 5 files, max 5, 100% >= 80% -> warn
		expect(results).toHaveLength(1);
		expect(results[0].severity).toBe("warn");
	});
});
