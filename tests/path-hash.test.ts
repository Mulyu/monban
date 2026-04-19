import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkPathHash } from "../src/rules/path/hash.js";

const cwd = resolve(import.meta.dirname, "fixtures/path-extras");

const PINNED_HASH =
	"731063b7d7a147ed2cad1c08d2e11b07332e17776b3939529cddce05b205910d";

describe("path/hash", () => {
	it("passes when file matches the expected sha256", async () => {
		const results = await checkPathHash(
			[{ path: "hash-target/pinned.txt", sha256: PINNED_HASH }],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});

	it("flags files that differ from the expected hash", async () => {
		const results = await checkPathHash(
			[
				{
					path: "hash-target/pinned.txt",
					sha256: "0".repeat(64),
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].rule).toBe("hash");
		expect(results[0].message).toContain("ハッシュ不一致");
	});

	it("reports when target glob matches no file", async () => {
		const results = await checkPathHash(
			[{ path: "nonexistent/file.txt", sha256: PINNED_HASH }],
			cwd,
			[],
		);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("見つかりません");
	});

	it("uppercases hash for comparison", async () => {
		const results = await checkPathHash(
			[
				{
					path: "hash-target/pinned.txt",
					sha256: PINNED_HASH.toUpperCase(),
				},
			],
			cwd,
			[],
		);
		expect(results).toHaveLength(0);
	});
});
