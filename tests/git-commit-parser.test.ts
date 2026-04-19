import { describe, expect, it } from "vitest";
import { parseTrailers } from "../src/rules/git/commits.js";

describe("git/parseTrailers", () => {
	it("returns empty for empty body", () => {
		expect(parseTrailers("")).toEqual([]);
	});

	it("returns empty when last block is not a trailer", () => {
		expect(parseTrailers("body\nmore body")).toEqual([]);
	});

	it("parses a single trailer", () => {
		const body = "line1\n\nSigned-off-by: Alice <alice@example.com>";
		expect(parseTrailers(body)).toEqual([
			{ key: "Signed-off-by", value: "Alice <alice@example.com>" },
		]);
	});

	it("parses multiple trailers", () => {
		const body =
			"body here\n\nSigned-off-by: Alice <a@a.com>\nCo-authored-by: Bob <b@b.com>";
		expect(parseTrailers(body)).toEqual([
			{ key: "Signed-off-by", value: "Alice <a@a.com>" },
			{ key: "Co-authored-by", value: "Bob <b@b.com>" },
		]);
	});

	it("ignores body lines that precede the trailer block", () => {
		const body = "first para\n\nmiddle\n\nSigned-off-by: Alice <a@a.com>";
		expect(parseTrailers(body)).toEqual([
			{ key: "Signed-off-by", value: "Alice <a@a.com>" },
		]);
	});

	it("does not parse trailers interleaved with body text", () => {
		const body = "Fixes: #123\nbody text that follows";
		expect(parseTrailers(body)).toEqual([]);
	});
});
