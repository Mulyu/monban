import { parse } from "yaml";
import type { ParseResult } from "./parse-json.js";

export function parseYaml<T = unknown>(content: string): ParseResult<T> {
	try {
		return { ok: true, value: parse(content) as T };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : String(e) };
	}
}
