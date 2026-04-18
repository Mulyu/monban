import type {
	ExtendsGitHub,
	ExtendsLocal,
	ExtendsSource,
} from "../../types.js";
import {
	assertObject,
	optionalString,
	requireString,
	validateArray,
} from "./common.js";

export function validateExtends(raw: unknown): ExtendsSource[] {
	if (typeof raw !== "object" || raw === null) return [];
	const obj = raw as Record<string, unknown>;
	if (obj.extends === undefined) return [];
	return validateArray(obj.extends, "extends", validateExtendsSource);
}

export function validateExtendsSource(
	raw: unknown,
	index: number,
	field: string,
): ExtendsSource {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const type = requireString(raw, "type", label);
	if (type === "local") {
		const rule: ExtendsLocal = {
			type: "local",
			path: requireString(raw, "path", label),
		};
		return rule;
	}
	if (type === "github") {
		const rule: ExtendsGitHub = {
			type: "github",
			repo: requireString(raw, "repo", label),
			path: requireString(raw, "path", label),
		};
		rule.ref = optionalString(raw, "ref", label);
		return rule;
	}
	throw new Error(`${label}.type must be "local" or "github"`);
}
