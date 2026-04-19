import type {
	ContentRequiredScope,
	GithubPinnedTarget,
	NamingStyle,
	RuleHints,
	Severity,
} from "../../types.js";

export const NAMING_STYLES: NamingStyle[] = [
	"pascal",
	"camel",
	"kebab",
	"snake",
];

export const SEVERITIES: Severity[] = ["error", "warn"];

export const CONTENT_REQUIRED_SCOPES: ContentRequiredScope[] = [
	"file",
	"first_line",
	"last_line",
];

export const PINNED_TARGETS: GithubPinnedTarget[] = [
	"action",
	"reusable",
	"docker",
];

export function validateArray<T>(
	raw: unknown,
	field: string,
	validator: (item: unknown, index: number, field: string) => T,
): T[] {
	if (!Array.isArray(raw)) {
		throw new Error(`${field} must be an array`);
	}
	return raw.map((item, i) => validator(item, i, field));
}

export function assertObject(
	raw: unknown,
	label: string,
): asserts raw is Record<string, unknown> {
	if (typeof raw !== "object" || raw === null) {
		throw new Error(`${label} must be an object`);
	}
}

export function requireString(
	obj: Record<string, unknown>,
	key: string,
	label: string,
): string {
	if (typeof obj[key] !== "string") {
		throw new Error(`${label}.${key} must be a string`);
	}
	return obj[key];
}

export function optionalString(
	obj: Record<string, unknown>,
	key: string,
	label: string,
): string | undefined {
	if (obj[key] === undefined) return undefined;
	if (typeof obj[key] !== "string") {
		throw new Error(`${label}.${key} must be a string`);
	}
	return obj[key];
}

export function optionalStringArray(
	obj: Record<string, unknown>,
	key: string,
	label: string,
): string[] | undefined {
	if (obj[key] === undefined) return undefined;
	if (
		!Array.isArray(obj[key]) ||
		!obj[key].every((v: unknown) => typeof v === "string")
	) {
		throw new Error(`${label}.${key} must be a string array`);
	}
	return obj[key];
}

export function validateSeverity(
	raw: Record<string, unknown>,
	label: string,
): Severity | undefined {
	const severity = optionalString(raw, "severity", label);
	if (severity === undefined) return undefined;
	if (!SEVERITIES.includes(severity as Severity)) {
		throw new Error(`${label}.severity must be "error" or "warn"`);
	}
	return severity as Severity;
}

export function validatePositiveNumber(
	raw: Record<string, unknown>,
	key: string,
	label: string,
): number | undefined {
	if (raw[key] === undefined) return undefined;
	const value = raw[key];
	if (typeof value !== "number" || !(value > 0)) {
		throw new Error(`${label}.${key} must be a positive number`);
	}
	return value;
}

export function validatePositiveInteger(
	raw: Record<string, unknown>,
	key: string,
	label: string,
): number | undefined {
	if (raw[key] === undefined) return undefined;
	const value = raw[key];
	if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
		throw new Error(`${label}.${key} must be a positive integer`);
	}
	return value;
}

/**
 * Apply optional `fail_text` and `docs_url` hints onto a rule object.
 * These hints flow through to every RuleResult the rule produces.
 */
export function applyRuleHints<T extends RuleHints>(
	rule: T,
	raw: Record<string, unknown>,
	label: string,
): T {
	const failText = optionalString(raw, "fail_text", label);
	if (failText !== undefined) rule.fail_text = failText;
	const docsUrl = optionalString(raw, "docs_url", label);
	if (docsUrl !== undefined) rule.docs_url = docsUrl;
	return rule;
}
