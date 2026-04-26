import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import { parse as parseYaml } from "yaml";
import type {
	RuleResult,
	RuntimeConsistencyRule,
	RuntimeConsistencySource,
} from "../../types.js";

interface DataPoint {
	file: string;
	value: string;
}

export async function checkRuntimeConsistency(
	rules: RuntimeConsistencyRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const points: DataPoint[] = [];

		for (const source of rule.sources) {
			const files = await fg(source.path, {
				cwd,
				dot: false,
				onlyFiles: true,
				ignore: globalExclude,
			});

			for (const file of files) {
				const abs = join(cwd, file);
				const values = await extractValues(abs, source);
				for (const value of values) {
					points.push({ file, value });
				}
			}
		}

		const byValue = new Map<string, Set<string>>();
		for (const { file, value } of points) {
			let files = byValue.get(value);
			if (!files) {
				files = new Set();
				byValue.set(value, files);
			}
			files.add(file);
		}

		if (byValue.size <= 1) continue;

		const valueList = [...byValue.keys()].sort().join(", ");
		const affected = new Set<string>();
		for (const files of byValue.values()) {
			for (const f of files) affected.add(f);
		}

		for (const file of [...affected].sort()) {
			results.push({
				rule: "consistency",
				path: file,
				message:
					rule.message ??
					`${rule.name} のバージョンが一貫していません: ${valueList}`,
				severity: rule.severity ?? "error",
			});
		}
	}

	return results;
}

async function extractValues(
	abs: string,
	source: RuntimeConsistencySource,
): Promise<string[]> {
	let raw: string;
	try {
		raw = await readFile(abs, "utf-8");
	} catch {
		return [];
	}

	if (source.pattern) {
		return extractByPattern(raw, source.pattern);
	}
	if (source.json_key) {
		let doc: unknown;
		try {
			doc = JSON.parse(raw);
		} catch {
			return [];
		}
		return resolveKey(doc, source.json_key);
	}
	if (source.yaml_key) {
		let doc: unknown;
		try {
			doc = parseYaml(raw);
		} catch {
			return [];
		}
		return resolveKey(doc, source.yaml_key);
	}

	const trimmed = raw.trim();
	return trimmed.length > 0 ? [trimmed] : [];
}

function extractByPattern(raw: string, pattern: string): string[] {
	const re = new RegExp(pattern, "gm");
	const out: string[] = [];
	for (const match of raw.matchAll(re)) {
		const value = match[1] ?? match[0];
		if (typeof value === "string" && value.length > 0) {
			out.push(value);
		}
	}
	return out;
}

function resolveKey(doc: unknown, path: string): string[] {
	const segments = path.split(".");
	const matches = walk(doc, segments);
	const out: string[] = [];
	for (const value of matches) {
		const stringified = stringifyScalar(value);
		if (stringified !== null) out.push(stringified);
	}
	return out;
}

function walk(node: unknown, segments: string[]): unknown[] {
	if (segments.length === 0) return [node];
	const [head, ...rest] = segments;
	if (head === "*") {
		if (Array.isArray(node)) {
			const out: unknown[] = [];
			for (const item of node) {
				out.push(...walk(item, rest));
			}
			return out;
		}
		if (node && typeof node === "object") {
			const out: unknown[] = [];
			for (const value of Object.values(node as Record<string, unknown>)) {
				out.push(...walk(value, rest));
			}
			return out;
		}
		return [];
	}
	if (Array.isArray(node)) return [];
	if (!node || typeof node !== "object") return [];
	const next = (node as Record<string, unknown>)[head];
	if (next === undefined) return [];
	return walk(next, rest);
}

function stringifyScalar(value: unknown): string | null {
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	return null;
}
