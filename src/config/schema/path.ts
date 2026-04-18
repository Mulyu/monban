import type {
	CompanionDef,
	CountRule,
	DepthRule,
	ForbiddenRule,
	NamingRule,
	NamingStyle,
	PathConfig,
	RequiredRule,
} from "../../types.js";
import {
	assertObject,
	NAMING_STYLES,
	optionalString,
	optionalStringArray,
	requireString,
	validateArray,
	validateSeverity,
} from "./common.js";

export function validatePathConfig(raw: unknown): PathConfig {
	if (typeof raw !== "object" || raw === null) {
		throw new Error("path must be an object");
	}

	const obj = raw as Record<string, unknown>;
	const config: PathConfig = {};

	if (obj.forbidden !== undefined) {
		config.forbidden = validateArray(
			obj.forbidden,
			"path.forbidden",
			validateForbiddenRule,
		);
	}
	if (obj.required !== undefined) {
		config.required = validateArray(
			obj.required,
			"path.required",
			validateRequiredRule,
		);
	}
	if (obj.naming !== undefined) {
		config.naming = validateArray(
			obj.naming,
			"path.naming",
			validateNamingRule,
		);
	}
	if (obj.depth !== undefined) {
		config.depth = validateArray(obj.depth, "path.depth", validateDepthRule);
	}
	if (obj.count !== undefined) {
		config.count = validateArray(obj.count, "path.count", validateCountRule);
	}

	return config;
}

function validateForbiddenRule(
	raw: unknown,
	index: number,
	field: string,
): ForbiddenRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: ForbiddenRule = {
		path: requireString(raw, "path", label),
	};
	rule.message = optionalString(raw, "message", label);

	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;

	return rule;
}

function validateRequiredRule(
	raw: unknown,
	index: number,
	field: string,
): RequiredRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: RequiredRule = {
		path: requireString(raw, "path", label),
	};
	rule.exclude = optionalStringArray(raw, "exclude", label);

	const files = optionalStringArray(raw, "files", label);
	if (files) {
		rule.files = files;
	}

	if (raw.companions !== undefined) {
		if (!Array.isArray(raw.companions)) {
			throw new Error(`${label}.companions must be an array`);
		}
		rule.companions = raw.companions.map(
			(c: unknown, ci: number): CompanionDef => {
				const clabel = `${label}.companions[${ci}]`;
				assertObject(c, clabel);
				const def: CompanionDef = {
					pattern: requireString(c, "pattern", clabel),
					required: typeof c.required === "boolean" ? c.required : true,
				};
				if (c.root !== undefined) {
					if (typeof c.root !== "boolean") {
						throw new Error(`${clabel}.root must be a boolean`);
					}
					def.root = c.root;
				}
				return def;
			},
		);
	}

	if (!rule.files && !rule.companions) {
		throw new Error(`${label} must have either "files" or "companions"`);
	}

	return rule;
}

function validateNamingRule(
	raw: unknown,
	index: number,
	field: string,
): NamingRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const style = requireString(raw, "style", label);
	if (!NAMING_STYLES.includes(style as NamingStyle)) {
		throw new Error(
			`${label}.style must be one of: ${NAMING_STYLES.join(", ")}`,
		);
	}

	const rule: NamingRule = {
		path: requireString(raw, "path", label),
		style: style as NamingStyle,
	};

	const target = optionalString(raw, "target", label);
	if (target !== undefined) {
		if (target !== "file" && target !== "directory") {
			throw new Error(`${label}.target must be "file" or "directory"`);
		}
		rule.target = target;
	}

	rule.prefix = optionalString(raw, "prefix", label);
	rule.suffix = optionalString(raw, "suffix", label);

	return rule;
}

function validateDepthRule(
	raw: unknown,
	index: number,
	field: string,
): DepthRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	if (typeof raw.max !== "number" || !Number.isInteger(raw.max)) {
		throw new Error(`${label}.max must be an integer`);
	}

	return {
		path: requireString(raw, "path", label),
		max: raw.max,
	};
}

function validateCountRule(
	raw: unknown,
	index: number,
	field: string,
): CountRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	if (typeof raw.max !== "number" || !Number.isInteger(raw.max)) {
		throw new Error(`${label}.max must be an integer`);
	}

	const rule: CountRule = {
		path: requireString(raw, "path", label),
		max: raw.max,
	};
	rule.exclude = optionalStringArray(raw, "exclude", label);

	return rule;
}
