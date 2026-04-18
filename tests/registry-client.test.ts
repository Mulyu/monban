import { describe, expect, it } from "vitest";
import { TtlCache } from "../src/ports/cache.js";
import {
	type HttpPort,
	HttpPortError,
	type HttpResponse,
} from "../src/ports/http.js";
import {
	EcosystemeClient,
	RegistryLookupError,
} from "../src/registry/index.js";

class StubHttpPort implements HttpPort {
	public calls: string[] = [];
	constructor(
		private readonly handler: (url: string) => HttpResponse<unknown> | Error,
	) {}
	async getJson<T>(url: string): Promise<HttpResponse<T>> {
		this.calls.push(url);
		const result = this.handler(url);
		if (result instanceof Error) throw result;
		return result as HttpResponse<T>;
	}
}

describe("EcosystemeClient", () => {
	it("maps a 2xx response into an existing PackageInfo", async () => {
		const http = new StubHttpPort(() => ({
			status: 200,
			ok: true,
			body: {
				downloads: 42,
				first_release_published_at: "2024-01-01T00:00:00Z",
			},
		}));
		const client = new EcosystemeClient({ http });
		const info = await client.lookup("lodash", "npm");
		expect(info.exists).toBe(true);
		expect(info.downloads).toBe(42);
		expect(info.publishedAt).toBe("2024-01-01T00:00:00Z");
		expect(http.calls[0]).toContain("registries/npmjs.org/packages/lodash");
	});

	it("maps a 404 response into an absent PackageInfo", async () => {
		const http = new StubHttpPort(() => ({
			status: 404,
			ok: false,
			body: null,
		}));
		const client = new EcosystemeClient({ http });
		const info = await client.lookup("not-real", "npm");
		expect(info.exists).toBe(false);
	});

	it("caches successful lookups and skips subsequent HTTP calls", async () => {
		const http = new StubHttpPort(() => ({
			status: 200,
			ok: true,
			body: { downloads: 1 },
		}));
		const client = new EcosystemeClient({ http });
		await client.lookup("pkg", "npm");
		await client.lookup("pkg", "npm");
		expect(http.calls.length).toBe(1);
	});

	it("respects injected TtlCache with custom TTL", async () => {
		let now = 0;
		const cache = new TtlCache<import("../src/registry/index.js").PackageInfo>({
			ttlMs: 100,
			now: () => now,
		});
		const http = new StubHttpPort(() => ({
			status: 200,
			ok: true,
			body: { downloads: 1 },
		}));
		const client = new EcosystemeClient({ http, cache });
		await client.lookup("pkg", "npm");
		now = 500;
		await client.lookup("pkg", "npm");
		expect(http.calls.length).toBe(2);
	});

	it("wraps HttpPortError as RegistryLookupError", async () => {
		const http = new StubHttpPort(() => new HttpPortError("boom"));
		const client = new EcosystemeClient({ http });
		await expect(client.lookup("pkg", "npm")).rejects.toBeInstanceOf(
			RegistryLookupError,
		);
	});
});
