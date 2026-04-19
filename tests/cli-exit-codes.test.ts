import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const BIN = resolve(import.meta.dirname, "../dist/bin.mjs");

async function mktemp(): Promise<string> {
	return mkdtemp(join(tmpdir(), "monban-cli-"));
}

function run(cwd: string, args: string[]): { status: number; stderr: string } {
	const result = spawnSync("node", [BIN, ...args], {
		cwd,
		encoding: "utf-8",
	});
	return { status: result.status ?? -1, stderr: result.stderr };
}

describe("cli exit codes", () => {
	const cleanups: string[] = [];

	afterEach(async () => {
		// test dirs are tmpdir; leaving them is fine for CI
		cleanups.length = 0;
	});

	it("exits 0 when all rules pass", async () => {
		const dir = await mktemp();
		cleanups.push(dir);
		await writeFile(
			join(dir, "monban.yml"),
			`path:\n  required:\n    - path: ".\\n"\n      files: []\n`,
		);
		const { status } = run(dir, ["path"]);
		expect(status).toBe(0);
	});

	it("exits 1 when rules report violations", async () => {
		const dir = await mktemp();
		cleanups.push(dir);
		await writeFile(
			join(dir, "monban.yml"),
			`path:\n  forbidden:\n    - path: "monban.yml"\n      message: "Forbidden!"\n`,
		);
		const { status } = run(dir, ["path"]);
		expect(status).toBe(1);
	});

	it("exits 0 when only warn-level findings are reported", async () => {
		const dir = await mktemp();
		cleanups.push(dir);
		await writeFile(
			join(dir, "monban.yml"),
			`content:\n  forbidden:\n    - path: "monban.yml"\n      pattern: "monban"\n      severity: warn\n`,
		);
		const { status } = run(dir, ["content"]);
		expect(status).toBe(0);
	});

	it("exits 2 when monban.yml is missing", async () => {
		const dir = await mktemp();
		cleanups.push(dir);
		const { status, stderr } = run(dir, ["path"]);
		expect(status).toBe(2);
		expect(stderr).toContain("monban.yml not found");
	});

	it("exits 2 when YAML is malformed", async () => {
		const dir = await mktemp();
		cleanups.push(dir);
		await writeFile(join(dir, "monban.yml"), "path: [invalid: yaml\n");
		const { status, stderr } = run(dir, ["path"]);
		expect(status).toBe(2);
		expect(stderr).toContain("Invalid monban.yml");
	});

	it("exits 2 when schema validation fails", async () => {
		const dir = await mktemp();
		cleanups.push(dir);
		await writeFile(
			join(dir, "monban.yml"),
			"path:\n  forbidden: not-an-array\n",
		);
		const { status, stderr } = run(dir, ["path"]);
		expect(status).toBe(2);
		expect(stderr).toContain("Invalid monban.yml");
	});
});
