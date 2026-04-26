export type ParseResult<T> =
	| { ok: true; value: T }
	| { ok: false; error: string };

export function parseJson<T = unknown>(content: string): ParseResult<T> {
	try {
		return { ok: true, value: JSON.parse(content) as T };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : String(e) };
	}
}
