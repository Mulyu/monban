import { describe, expect, it } from "vitest";
import { TtlCache } from "../src/ports/cache.js";

describe("TtlCache", () => {
	it("returns undefined for unknown keys", () => {
		const cache = new TtlCache<string>();
		expect(cache.get("missing")).toBeUndefined();
	});

	it("returns stored value before TTL expires", () => {
		let now = 0;
		const cache = new TtlCache<string>({ ttlMs: 100, now: () => now });
		cache.set("k", "v");
		now = 50;
		expect(cache.get("k")).toBe("v");
	});

	it("expires entries past TTL", () => {
		let now = 0;
		const cache = new TtlCache<string>({ ttlMs: 100, now: () => now });
		cache.set("k", "v");
		now = 200;
		expect(cache.get("k")).toBeUndefined();
		expect(cache.size()).toBe(0);
	});

	it("evicts the oldest entry when maxEntries is exceeded", () => {
		const cache = new TtlCache<string>({ maxEntries: 2, ttlMs: 1000 });
		cache.set("a", "1");
		cache.set("b", "2");
		cache.set("c", "3");
		expect(cache.get("a")).toBeUndefined();
		expect(cache.get("b")).toBe("2");
		expect(cache.get("c")).toBe("3");
		expect(cache.size()).toBe(2);
	});

	it("refreshes access order on get (LRU)", () => {
		const cache = new TtlCache<string>({ maxEntries: 2, ttlMs: 1000 });
		cache.set("a", "1");
		cache.set("b", "2");
		cache.get("a");
		cache.set("c", "3");
		expect(cache.get("a")).toBe("1");
		expect(cache.get("b")).toBeUndefined();
	});

	it("replaces the value when setting the same key", () => {
		const cache = new TtlCache<string>();
		cache.set("k", "v1");
		cache.set("k", "v2");
		expect(cache.get("k")).toBe("v2");
		expect(cache.size()).toBe(1);
	});
});
