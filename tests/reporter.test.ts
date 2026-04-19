import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CategoryGroup, CategoryRuleResult } from "../src/reporter.js";
import {
	hasErrors,
	hasErrorsInGroups,
	reportAllResults,
	reportCategory,
} from "../src/reporter.js";

function passing(name: string): CategoryRuleResult {
	return { name, results: [] };
}

function withErrors(name: string, count = 1): CategoryRuleResult {
	return {
		name,
		results: Array.from({ length: count }, (_, i) => ({
			rule: name,
			path: `src/file${i}.ts`,
			message: `bad thing ${i}`,
			severity: "error" as const,
		})),
	};
}

function withWarnings(name: string, count = 1): CategoryRuleResult {
	return {
		name,
		results: Array.from({ length: count }, (_, i) => ({
			rule: name,
			path: `src/file${i}.ts`,
			message: `warning ${i}`,
			severity: "warn" as const,
		})),
	};
}

describe("reporter/hasErrors", () => {
	it("returns false for passing rules", () => {
		expect(hasErrors([passing("a"), passing("b")])).toBe(false);
	});

	it("returns false when only warnings are present", () => {
		expect(hasErrors([withWarnings("a")])).toBe(false);
	});

	it("returns true when any rule reports an error", () => {
		expect(hasErrors([passing("a"), withErrors("b")])).toBe(true);
	});
});

describe("reporter/hasErrorsInGroups", () => {
	it("returns false when every group passes", () => {
		const groups: CategoryGroup[] = [
			{ category: "path", results: [passing("forbidden")] },
			{ category: "content", results: [withWarnings("required")] },
		];
		expect(hasErrorsInGroups(groups)).toBe(false);
	});

	it("returns true when any group has errors", () => {
		const groups: CategoryGroup[] = [
			{ category: "path", results: [passing("forbidden")] },
			{ category: "content", results: [withErrors("forbidden")] },
		];
		expect(hasErrorsInGroups(groups)).toBe(true);
	});
});

describe("reporter/reportCategory JSON output", () => {
	let logSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		logSpy.mockRestore();
	});

	it("emits structured JSON with rule/violations keys", () => {
		reportCategory(
			"content",
			[withErrors("forbidden", 2), passing("size")],
			true,
		);
		expect(logSpy).toHaveBeenCalledTimes(1);
		const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
		expect(payload).toEqual([
			{
				rule: "forbidden",
				violations: [
					{
						path: "src/file0.ts",
						message: "bad thing 0",
						severity: "error",
					},
					{
						path: "src/file1.ts",
						message: "bad thing 1",
						severity: "error",
					},
				],
			},
			{ rule: "size", violations: [] },
		]);
	});
});

describe("reporter/reportAllResults JSON output", () => {
	let logSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		logSpy.mockRestore();
	});

	it("emits a category-keyed JSON object", () => {
		const groups: CategoryGroup[] = [
			{ category: "path", results: [withErrors("forbidden")] },
			{ category: "content", results: [passing("size")] },
		];
		reportAllResults(groups, true);
		const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
		expect(Object.keys(payload).sort()).toEqual(["content", "path"]);
		expect(payload.path[0].rule).toBe("forbidden");
		expect(payload.content[0].violations).toEqual([]);
	});
});

describe("reporter text output", () => {
	let logSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		logSpy.mockRestore();
	});

	it("reports 'All checks passed' when everything passes", () => {
		reportCategory("path", [passing("forbidden")], false);
		const output = logSpy.mock.calls.map((c) => c[0]).join("\n");
		expect(output).toContain("All checks passed.");
	});

	it("prints violation counts and details when violations exist", () => {
		reportCategory(
			"content",
			[withErrors("forbidden"), withWarnings("required")],
			false,
		);
		const output = logSpy.mock.calls.map((c) => c[0]).join("\n");
		expect(output).toContain("ERROR");
		expect(output).toContain("WARN");
		expect(output).toContain("1 error");
		expect(output).toContain("1 warning");
	});

	it("uses a known title for each category", () => {
		reportCategory("github", [passing("actions.pinned")], false);
		const output = logSpy.mock.calls.map((c) => c[0]).join("\n");
		expect(output).toContain("monban github");
	});
});
