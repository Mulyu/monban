export interface HttpResponse<T> {
	status: number;
	ok: boolean;
	body: T | null;
}

export interface HttpPort {
	getJson<T>(url: string): Promise<HttpResponse<T>>;
}

export class HttpPortError extends Error {}

const DEFAULT_TIMEOUT_MS = 10_000;

export class FetchHttpPort implements HttpPort {
	private readonly timeoutMs: number;

	constructor(opts: { timeoutMs?: number } = {}) {
		this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	}

	async getJson<T>(url: string): Promise<HttpResponse<T>> {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.timeoutMs);
		try {
			const res = await fetch(url, { signal: controller.signal });
			if (res.status === 404) {
				return { status: 404, ok: false, body: null };
			}
			if (!res.ok) {
				throw new HttpPortError(`HTTP ${res.status} for ${url}`);
			}
			const body = (await res.json()) as T;
			return { status: res.status, ok: true, body };
		} catch (err) {
			if (err instanceof HttpPortError) throw err;
			throw new HttpPortError(
				`Request to ${url} failed: ${(err as Error).message}`,
			);
		} finally {
			clearTimeout(timer);
		}
	}
}
