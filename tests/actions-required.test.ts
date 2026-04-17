import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkActionsRequired } from "../src/rules/actions/required.js";

const cwd = resolve(import.meta.dirname, "fixtures/actions");

describe("actions/required", () => {
	describe("file mode", () => {
		it("passes when workflow file exists", async () => {
			const results = await checkActionsRequired(
				[{ file: ".github/workflows/pinned.yml" }],
				cwd,
			);
			expect(results).toHaveLength(0);
		});

		it("reports when workflow file is missing", async () => {
			const results = await checkActionsRequired(
				[{ file: ".github/workflows/lint.yml" }],
				cwd,
			);
			expect(results).toHaveLength(1);
			expect(results[0].rule).toBe("required");
			expect(results[0].message).toContain("必須ワークフロー");
		});
	});

	describe("steps mode", () => {
		it("passes when required steps exist", async () => {
			const results = await checkActionsRequired(
				[
					{
						path: ".github/workflows/pinned.yml",
						steps: ["actions/checkout"],
					},
				],
				cwd,
			);
			expect(results).toHaveLength(0);
		});

		it("reports when required step is missing", async () => {
			const results = await checkActionsRequired(
				[
					{
						path: ".github/workflows/pinned.yml",
						steps: ["actions/checkout", "actions/cache"],
					},
				],
				cwd,
			);
			expect(results).toHaveLength(1);
			expect(results[0].message).toContain("actions/cache");
		});

		it("reports when workflow file does not exist", async () => {
			const results = await checkActionsRequired(
				[
					{
						path: ".github/workflows/nonexistent.yml",
						steps: ["actions/checkout"],
					},
				],
				cwd,
			);
			expect(results).toHaveLength(1);
			expect(results[0].message).toContain("ワークフローファイル");
		});
	});
});
