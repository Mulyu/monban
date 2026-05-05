export interface CacheOpts {
	ttlMs?: number;
	maxEntries?: number;
	now?: () => number;
}

interface Entry<T> {
	value: T;
	expiresAt: number;
}

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 1000;

export class TtlCache<T> {
	private readonly store = new Map<string, Entry<T>>();
	private readonly ttlMs: number;
	private readonly maxEntries: number;
	private readonly now: () => number;

	constructor(opts: CacheOpts = {}) {
		this.ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
		this.maxEntries = opts.maxEntries ?? DEFAULT_MAX_ENTRIES;
		this.now = opts.now ?? (() => Date.now());
	}

	get(key: string): T | undefined {
		const entry = this.store.get(key);
		if (!entry) return undefined;
		if (entry.expiresAt <= this.now()) {
			this.store.delete(key);
			return undefined;
		}
		this.store.delete(key);
		this.store.set(key, entry);
		return entry.value;
	}

	set(key: string, value: T): void {
		if (this.store.has(key)) {
			this.store.delete(key);
		}
		this.store.set(key, { value, expiresAt: this.now() + this.ttlMs });
		while (this.store.size > this.maxEntries) {
			const oldest = this.store.keys().next().value;
			if (oldest === undefined) break;
			this.store.delete(oldest);
		}
	}

	size(): number {
		return this.store.size;
	}
}
