import { describe, expect, it } from "vitest";
import { applyDiffFilter } from "../src/diff.js";
import type { DiffScope, RuleResult } from "../src/types.js";

function makeScope(
	files: string[],
	lines: Record<string, number[]> = {},
	granularity: "file" | "line" = "file",
): DiffScope {
	return {
		files: new Set(files),
		addedLines: new Map(Object.entries(lines).map(([k, v]) => [k, new Set(v)])),
		granularity,
	};
}

const error: "error" = "error";

describe("applyDiffFilter", () => {
	it("returns original results when scope is null", () => {
		const results: RuleResult[] = [
			{ rule: "r", path: "a.ts", message: "m", severity: error },
		];
		expect(applyDiffFilter(results, null)).toEqual(results);
	});

	it("keeps violations whose file is in the diff set (file granularity)", () => {
		const scope = makeScope(["src/a.ts", "src/b.ts"]);
		const results: RuleResult[] = [
			{ rule: "r", path: "src/a.ts", message: "m", severity: error },
			{ rule: "r", path: "src/c.ts", message: "m", severity: error },
			{ rule: "r", path: "src/b.ts:12", message: "m", severity: error },
		];
		const filtered = applyDiffFilter(results, scope);
		expect(filtered.map((r) => r.path)).toEqual(["src/a.ts", "src/b.ts:12"]);
	});

	it("filters by added lines when granularity is line", () => {
		const scope = makeScope(["src/a.ts"], { "src/a.ts": [5, 6, 7] }, "line");
		const results: RuleResult[] = [
			{ rule: "r", path: "src/a.ts:3", message: "m", severity: error },
			{ rule: "r", path: "src/a.ts:5", message: "m", severity: error },
			{ rule: "r", path: "src/a.ts:8", message: "m", severity: error },
			{ rule: "r", path: "src/a.ts", message: "m", severity: error },
		];
		const filtered = applyDiffFilter(results, scope);
		expect(filtered.map((r) => r.path)).toEqual(["src/a.ts:5", "src/a.ts"]);
	});

	it("treats paths without :<digit> suffix as file-level results", () => {
		const scope = makeScope(["src/a.ts"], { "src/a.ts": [1] }, "line");
		const results: RuleResult[] = [
			{ rule: "r", path: "src/a.ts", message: "m", severity: error },
		];
		expect(applyDiffFilter(results, scope)).toHaveLength(1);
	});
});
