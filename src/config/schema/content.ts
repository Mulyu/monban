import type {
	ContentConfig,
	ContentForbiddenRule,
	ContentRequiredRule,
	ContentRequiredScope,
	ContentSizeRule,
} from "../../types.js";
import {
	assertObject,
	CONTENT_REQUIRED_SCOPES,
	optionalString,
	optionalStringArray,
	requireString,
	validateArray,
	validatePositiveInteger,
	validateSeverity,
} from "./common.js";

export function validateContentConfig(raw: unknown): ContentConfig {
	if (typeof raw !== "object" || raw === null) {
		throw new Error("content must be an object");
	}

	const obj = raw as Record<string, unknown>;
	const config: ContentConfig = {};

	if (obj.forbidden !== undefined) {
		config.forbidden = validateArray(
			obj.forbidden,
			"content.forbidden",
			validateContentForbiddenRule,
		);
	}
	if (obj.required !== undefined) {
		config.required = validateArray(
			obj.required,
			"content.required",
			validateContentRequiredRule,
		);
	}
	if (obj.size !== undefined) {
		config.size = validateArray(
			obj.size,
			"content.size",
			validateContentSizeRule,
		);
	}

	return config;
}

function validateContentForbiddenRule(
	raw: unknown,
	index: number,
	field: string,
): ContentForbiddenRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: ContentForbiddenRule = {
		path: requireString(raw, "path", label),
	};
	rule.exclude = optionalStringArray(raw, "exclude", label);

	rule.pattern = optionalString(raw, "pattern", label);

	const jsonKey = optionalString(raw, "json_key", label);
	if (jsonKey !== undefined) rule.json_key = jsonKey;

	if (raw.bom !== undefined) {
		if (typeof raw.bom !== "boolean") {
			throw new Error(`${label}.bom must be a boolean`);
		}
		rule.bom = raw.bom;
	}

	if (raw.invisible !== undefined) {
		if (typeof raw.invisible !== "boolean") {
			throw new Error(`${label}.invisible must be a boolean`);
		}
		rule.invisible = raw.invisible;
	}

	if (raw.secret !== undefined) {
		if (typeof raw.secret !== "boolean") {
			throw new Error(`${label}.secret must be a boolean`);
		}
		rule.secret = raw.secret;
	}

	if (raw.injection !== undefined) {
		if (typeof raw.injection !== "boolean") {
			throw new Error(`${label}.injection must be a boolean`);
		}
		rule.injection = raw.injection;
	}

	if (raw.conflict !== undefined) {
		if (typeof raw.conflict !== "boolean") {
			throw new Error(`${label}.conflict must be a boolean`);
		}
		rule.conflict = raw.conflict;
	}

	if (
		!rule.pattern &&
		!rule.json_key &&
		!rule.bom &&
		!rule.invisible &&
		!rule.secret &&
		!rule.injection &&
		!rule.conflict
	) {
		throw new Error(
			`${label} must have at least one of: pattern, json_key, bom, invisible, secret, injection, conflict`,
		);
	}

	if (
		rule.json_key &&
		(rule.bom ||
			rule.invisible ||
			rule.secret ||
			rule.injection ||
			rule.conflict)
	) {
		throw new Error(
			`${label}.json_key cannot be combined with bom/invisible/secret/injection/conflict (byte-level checks)`,
		);
	}

	rule.message = optionalString(raw, "message", label);

	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;

	return rule;
}

function validateContentRequiredRule(
	raw: unknown,
	index: number,
	field: string,
): ContentRequiredRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: ContentRequiredRule = {
		path: requireString(raw, "path", label),
		pattern: requireString(raw, "pattern", label),
	};
	rule.exclude = optionalStringArray(raw, "exclude", label);

	const jsonKey = optionalString(raw, "json_key", label);
	if (jsonKey !== undefined) rule.json_key = jsonKey;

	const scope = optionalString(raw, "scope", label);
	if (scope !== undefined) {
		if (!CONTENT_REQUIRED_SCOPES.includes(scope as ContentRequiredScope)) {
			throw new Error(
				`${label}.scope must be one of: ${CONTENT_REQUIRED_SCOPES.join(", ")}`,
			);
		}
		rule.scope = scope as ContentRequiredScope;
	}

	const withinLines = validatePositiveInteger(raw, "within_lines", label);
	if (withinLines !== undefined) {
		if (rule.scope !== undefined && rule.scope !== "file") {
			throw new Error(
				`${label}.within_lines cannot be combined with scope: ${rule.scope}`,
			);
		}
		rule.within_lines = withinLines;
	}

	if (
		rule.json_key &&
		(rule.scope !== undefined || rule.within_lines !== undefined)
	) {
		throw new Error(
			`${label}.json_key cannot be combined with scope/within_lines (line-level options)`,
		);
	}

	rule.message = optionalString(raw, "message", label);

	return rule;
}

function validateContentSizeRule(
	raw: unknown,
	index: number,
	field: string,
): ContentSizeRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const maxLines = validatePositiveInteger(raw, "max_lines", label);
	if (maxLines === undefined) {
		throw new Error(`${label}.max_lines is required`);
	}

	const rule: ContentSizeRule = {
		path: requireString(raw, "path", label),
		max_lines: maxLines,
	};
	rule.exclude = optionalStringArray(raw, "exclude", label);
	rule.message = optionalString(raw, "message", label);

	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;

	return rule;
}
