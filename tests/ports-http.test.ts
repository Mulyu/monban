import { afterEach, describe, expect, it, vi } from "vitest";
import { FetchHttpPort, HttpPortError } from "../src/ports/http.js";

describe("FetchHttpPort", () => {
	const originalFetch = globalThis.fetch;

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	it("returns parsed JSON for 2xx responses", async () => {
		globalThis.fetch = vi.fn(
			async () => new Response(JSON.stringify({ ok: 1 }), { status: 200 }),
		) as typeof fetch;

		const port = new FetchHttpPort();
		const res = await port.getJson<{ ok: number }>("https://example.com/x");
		expect(res.ok).toBe(true);
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ ok: 1 });
	});

	it("returns an absent response for 404 without throwing", async () => {
		globalThis.fetch = vi.fn(
			async () => new Response("not found", { status: 404 }),
		) as typeof fetch;

		const port = new FetchHttpPort();
		const res = await port.getJson("https://example.com/missing");
		expect(res.ok).toBe(false);
		expect(res.status).toBe(404);
		expect(res.body).toBeNull();
	});

	it("throws HttpPortError for non-404 error responses", async () => {
		globalThis.fetch = vi.fn(
			async () => new Response("boom", { status: 500 }),
		) as typeof fetch;

		const port = new FetchHttpPort();
		await expect(
			port.getJson("https://example.com/oops"),
		).rejects.toBeInstanceOf(HttpPortError);
	});

	it("wraps fetch exceptions as HttpPortError", async () => {
		globalThis.fetch = vi.fn(async () => {
			throw new Error("network boom");
		}) as typeof fetch;

		const port = new FetchHttpPort();
		await expect(port.getJson("https://example.com")).rejects.toBeInstanceOf(
			HttpPortError,
		);
	});

	it("aborts the request after timeoutMs", async () => {
		globalThis.fetch = vi.fn(
			(_url: string | URL | Request, init?: RequestInit) =>
				new Promise((_resolve, reject) => {
					init?.signal?.addEventListener("abort", () => {
						reject(new DOMException("aborted", "AbortError"));
					});
				}),
		) as typeof fetch;

		const port = new FetchHttpPort({ timeoutMs: 5 });
		await expect(port.getJson("https://example.com")).rejects.toBeInstanceOf(
			HttpPortError,
		);
	});
});
