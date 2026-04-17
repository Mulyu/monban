import { describe, expect, it } from "vitest";
import { mergeRawConfigs } from "../src/config/extends/index.js";

describe("extends/merge", () => {
	it("concatenates arrays", () => {
		const a = { path: { forbidden: [{ path: "a" }] } };
		const b = { path: { forbidden: [{ path: "b" }] } };
		const result = mergeRawConfigs(a, b);
		expect(result).toEqual({
			path: {
				forbidden: [{ path: "a" }, { path: "b" }],
			},
		});
	});

	it("child scalar wins", () => {
		const a = { verbose: false };
		const b = { verbose: true };
		expect(mergeRawConfigs(a, b)).toEqual({ verbose: true });
	});

	it("deep merges objects", () => {
		const a = { path: { forbidden: [{ path: "a" }] } };
		const b = { path: { required: [{ path: "b" }] } };
		expect(mergeRawConfigs(a, b)).toEqual({
			path: {
				forbidden: [{ path: "a" }],
				required: [{ path: "b" }],
			},
		});
	});

	it("merges exclude arrays", () => {
		const a = { exclude: ["**/node_modules/**"] };
		const b = { exclude: ["**/dist/**"] };
		expect(mergeRawConfigs(a, b)).toEqual({
			exclude: ["**/node_modules/**", "**/dist/**"],
		});
	});

	it("merges multiple configs in order", () => {
		const a = { path: { forbidden: [{ path: "a" }] } };
		const b = { path: { forbidden: [{ path: "b" }] } };
		const c = { path: { forbidden: [{ path: "c" }] } };
		expect(mergeRawConfigs(a, b, c)).toEqual({
			path: {
				forbidden: [{ path: "a" }, { path: "b" }, { path: "c" }],
			},
		});
	});

	it("strips extends field from result", () => {
		const a = { path: { forbidden: [{ path: "a" }] } };
		const b = {
			extends: [{ type: "local", path: "./foo.yml" }],
			path: { forbidden: [{ path: "b" }] },
		};
		const result = mergeRawConfigs(a, b) as Record<string, unknown>;
		expect(result.extends).toBeUndefined();
		expect(result.path).toEqual({
			forbidden: [{ path: "a" }, { path: "b" }],
		});
	});

	it("handles null/undefined inputs", () => {
		expect(mergeRawConfigs({ a: 1 }, null)).toEqual({ a: 1 });
		expect(mergeRawConfigs(null, { a: 1 })).toEqual({ a: 1 });
		expect(mergeRawConfigs(undefined, { a: 1 })).toEqual({ a: 1 });
	});

	it("handles empty inputs", () => {
		expect(mergeRawConfigs()).toEqual({});
		expect(mergeRawConfigs({})).toEqual({});
	});
});
