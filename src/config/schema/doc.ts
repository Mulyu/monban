import type { DocConfig, DocLinkRule, DocRefRule } from "../../types.js";
import { assertObject, requireString, validateArray } from "./common.js";

export function validateDocConfig(raw: unknown): DocConfig {
	if (typeof raw !== "object" || raw === null) {
		throw new Error("doc must be an object");
	}

	const obj = raw as Record<string, unknown>;
	const config: DocConfig = {};

	if (obj.ref !== undefined) {
		config.ref = validateArray(obj.ref, "doc.ref", validateDocRefRule);
	}
	if (obj.link !== undefined) {
		config.link = validateArray(obj.link, "doc.link", validateDocLinkRule);
	}

	return config;
}

function validateDocRefRule(
	raw: unknown,
	index: number,
	field: string,
): DocRefRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);
	return { path: requireString(raw, "path", label) };
}

function validateDocLinkRule(
	raw: unknown,
	index: number,
	field: string,
): DocLinkRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);
	return { path: requireString(raw, "path", label) };
}
