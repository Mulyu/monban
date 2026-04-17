/**
 * Raw config objects are merged by:
 * - Arrays: concat (parent first, then child)
 * - Objects: recursive merge
 * - Scalars: child wins
 * - `extends` field is dropped from the merged result (it is not transitively resolved)
 */
export function mergeRawConfigs(...configs: unknown[]): unknown {
	let result: unknown = {};
	for (const config of configs) {
		result = mergeTwo(result, config);
	}
	return stripExtends(result);
}

function mergeTwo(a: unknown, b: unknown): unknown {
	if (b === null || b === undefined) return a;
	if (a === null || a === undefined) return b;

	if (Array.isArray(a) && Array.isArray(b)) {
		return [...a, ...b];
	}

	if (isPlainObject(a) && isPlainObject(b)) {
		const result: Record<string, unknown> = { ...a };
		for (const [key, value] of Object.entries(b)) {
			result[key] = key in result ? mergeTwo(result[key], value) : value;
		}
		return result;
	}

	return b;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
	return (
		typeof v === "object" &&
		v !== null &&
		!Array.isArray(v) &&
		Object.getPrototypeOf(v) === Object.prototype
	);
}

function stripExtends(config: unknown): unknown {
	if (!isPlainObject(config)) return config;
	const { extends: _extends, ...rest } = config;
	return rest;
}
