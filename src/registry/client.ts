import { TtlCache } from "../ports/cache.js";
import { FetchHttpPort, type HttpPort, HttpPortError } from "../ports/http.js";
import type { DepsEcosystem } from "../types.js";

export interface PackageInfo {
	name: string;
	ecosystem: DepsEcosystem;
	exists: boolean;
	publishedAt?: string;
	downloads?: number;
}

export interface RegistryClient {
	lookup(name: string, ecosystem: DepsEcosystem): Promise<PackageInfo>;
	lookupAcross(name: string): Promise<PackageInfo[]>;
}

export const ECOSYSTEME_REGISTRIES: Record<DepsEcosystem, string> = {
	npm: "npmjs.org",
	pypi: "pypi.org",
	rubygems: "rubygems.org",
	cargo: "crates.io",
	go: "proxy.golang.org",
	"github-actions": "github actions",
};

const ALL_ECOSYSTEMS: DepsEcosystem[] = [
	"npm",
	"pypi",
	"rubygems",
	"cargo",
	"go",
	"github-actions",
];

interface EcosystemeResponse {
	name?: string;
	downloads?: number;
	downloads_period?: string;
	first_release_published_at?: string;
	latest_release_published_at?: string;
}

export interface EcosystemeClientOpts {
	baseUrl?: string;
	http?: HttpPort;
	cache?: TtlCache<PackageInfo>;
}

export class EcosystemeClient implements RegistryClient {
	private readonly baseUrl: string;
	private readonly http: HttpPort;
	private readonly cache: TtlCache<PackageInfo>;

	constructor(opts: EcosystemeClientOpts = {}) {
		this.baseUrl = (
			opts.baseUrl ?? "https://packages.ecosyste.ms/api/v1"
		).replace(/\/$/, "");
		this.http = opts.http ?? new FetchHttpPort();
		this.cache = opts.cache ?? new TtlCache<PackageInfo>();
	}

	async lookup(name: string, ecosystem: DepsEcosystem): Promise<PackageInfo> {
		const key = `${ecosystem}:${name}`;
		const cached = this.cache.get(key);
		if (cached) return cached;

		const registry = ECOSYSTEME_REGISTRIES[ecosystem];
		if (!registry) {
			const info: PackageInfo = { name, ecosystem, exists: false };
			this.cache.set(key, info);
			return info;
		}

		const url = `${this.baseUrl}/registries/${encodeURIComponent(registry)}/packages/${encodeURIComponent(name)}`;
		try {
			const res = await this.http.getJson<EcosystemeResponse>(url);
			if (!res.ok || res.body === null) {
				const info: PackageInfo = { name, ecosystem, exists: false };
				this.cache.set(key, info);
				return info;
			}
			const body = res.body;
			const info: PackageInfo = {
				name,
				ecosystem,
				exists: true,
				publishedAt:
					body.first_release_published_at ?? body.latest_release_published_at,
				downloads:
					typeof body.downloads === "number" ? body.downloads : undefined,
			};
			this.cache.set(key, info);
			return info;
		} catch (err) {
			if (err instanceof HttpPortError) {
				throw new RegistryLookupError(
					`Failed to look up ${name} on ${registry}: ${err.message}`,
				);
			}
			throw err;
		}
	}

	async lookupAcross(name: string): Promise<PackageInfo[]> {
		const results = await Promise.all(
			ALL_ECOSYSTEMS.map((eco) =>
				this.lookup(name, eco).catch(
					(): PackageInfo => ({ name, ecosystem: eco, exists: false }),
				),
			),
		);
		return results;
	}
}

export class RegistryLookupError extends Error {}

export class OfflineRegistryClient implements RegistryClient {
	async lookup(name: string, ecosystem: DepsEcosystem): Promise<PackageInfo> {
		return { name, ecosystem, exists: true };
	}
	async lookupAcross(name: string): Promise<PackageInfo[]> {
		return [{ name, ecosystem: "npm", exists: true }];
	}
}
