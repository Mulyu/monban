import {
	assertObject,
	optionalString,
	optionalStringArray,
	requireString,
	validateArray,
	validatePositiveInteger,
	validateSeverity,
} from "../../config/schema/common.js";
import type {
	LicenseConfig,
	LicenseFileRule,
	LicenseHeaderRule,
} from "../../rules/license/types.js";

export function validateLicenseConfig(raw: unknown): LicenseConfig {
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
		throw new Error("license must be an object");
	}

	const obj = raw as Record<string, unknown>;
	const config: LicenseConfig = {};

	if (obj.file !== undefined) {
		config.file = validateArray(obj.file, "license.file", validateFileRule);
	}
	if (obj.header !== undefined) {
		config.header = validateArray(
			obj.header,
			"license.header",
			validateHeaderRule,
		);
	}

	return config;
}

function validateFileRule(
	raw: unknown,
	index: number,
	field: string,
): LicenseFileRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: LicenseFileRule = {
		path: requireString(raw, "path", label),
	};

	const allowed = optionalStringArray(raw, "allowed", label);
	if (allowed !== undefined) rule.allowed = allowed;
	const message = optionalString(raw, "message", label);
	if (message !== undefined) rule.message = message;
	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;

	return rule;
}

function validateHeaderRule(
	raw: unknown,
	index: number,
	field: string,
): LicenseHeaderRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: LicenseHeaderRule = {
		path: requireString(raw, "path", label),
	};

	const exclude = optionalStringArray(raw, "exclude", label);
	if (exclude !== undefined) rule.exclude = exclude;
	const allowed = optionalStringArray(raw, "allowed", label);
	if (allowed !== undefined) rule.allowed = allowed;
	const within = validatePositiveInteger(raw, "within_lines", label);
	if (within !== undefined) rule.within_lines = within;
	const message = optionalString(raw, "message", label);
	if (message !== undefined) rule.message = message;
	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;

	return rule;
}
