import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkDocRef } from "../src/rules/doc/ref.js";

const cwd = resolve(import.meta.dirname, "fixtures/doc");

describe("doc/ref", () => {
	it("passes when hash matches", async () => {
		const results = await checkDocRef([{ path: "valid-ref.md" }], cwd, []);
		expect(results).toHaveLength(0);
	});

	it("reports when hash does not match", async () => {
		const results = await checkDocRef([{ path: "stale-ref.md" }], cwd, []);
		expect(results).toHaveLength(1);
		expect(results[0].rule).toBe("ref");
		expect(results[0].message).toContain("ハッシュ不一致");
		expect(results[0].path).toMatch(/stale-ref\.md:\d+/);
	});

	it("reports when referenced file is missing", async () => {
		const results = await checkDocRef([{ path: "missing-ref.md" }], cwd, []);
		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("参照先ファイルが見つかりません");
	});

	it("respects global exclude", async () => {
		const results = await checkDocRef([{ path: "**/*.md" }], cwd, [
			"**/stale-ref.md",
		]);
		const stale = results.filter((r) => r.path.includes("stale-ref"));
		expect(stale).toHaveLength(0);
	});
});
