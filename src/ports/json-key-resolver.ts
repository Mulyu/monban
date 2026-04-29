export interface JsonKeyMatch {
	key: string;
	value: unknown;
}

export function resolveJsonKey(doc: unknown, path: string): JsonKeyMatch[] {
	const segments = path.split(".");
	return walk(doc, segments, []);
}

function walk(
	node: unknown,
	segments: string[],
	visited: string[],
): JsonKeyMatch[] {
	if (segments.length === 0) {
		return [{ key: visited.join("."), value: node }];
	}
	const [head, ...rest] = segments;
	if (head === "*") {
		if (!node || typeof node !== "object" || Array.isArray(node)) return [];
		const out: JsonKeyMatch[] = [];
		for (const [childKey, childValue] of Object.entries(
			node as Record<string, unknown>,
		)) {
			out.push(...walk(childValue, rest, [...visited, childKey]));
		}
		return out;
	}
	if (!node || typeof node !== "object" || Array.isArray(node)) return [];
	const next = (node as Record<string, unknown>)[head];
	if (next === undefined) return [];
	return walk(next, rest, [...visited, head]);
}
