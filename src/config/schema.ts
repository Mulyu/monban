import type {
	CompanionDef,
	ContentConfig,
	ContentForbiddenRule,
	ContentRequiredRule,
	ContentRequiredScope,
	CountRule,
	DepthRule,
	ForbiddenRule,
	MonbanConfig,
	NamingRule,
	NamingStyle,
	PathConfig,
	RequiredRule,
	Severity,
} from "../types.js";

const NAMING_STYLES: NamingStyle[] = ["pascal", "camel", "kebab", "snake"];

const SEVERITIES: Severity[] = ["error", "warn"];

const CONTENT_REQUIRED_SCOPES: ContentRequiredScope[] = [
	"file",
	"first_line",
	"last_line",
];

export function validateConfig(raw: unknown): MonbanConfig {
	if (raw === null || raw === undefined) {
		return {};
	}
	if (typeof raw !== "object") {
		throw new Error("monban.yml must be a YAML object");
	}

	const obj = raw as Record<string, unknown>;
	const config: MonbanConfig = {};

	config.exclude = optionalStringArray(obj, "exclude", "monban.yml") ?? [];

	if (obj.path !== undefined) {
		config.path = validatePathConfig(obj.path);
	}

	if (obj.content !== undefined) {
		config.content = validateContentConfig(obj.content);
	}

	return config;
}

function validatePathConfig(raw: unknown): PathConfig {
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

function validateArray<T>(
	raw: unknown,
	field: string,
	validator: (item: unknown, index: number, field: string) => T,
): T[] {
	if (!Array.isArray(raw)) {
		throw new Error(`${field} must be an array`);
	}
	return raw.map((item, i) => validator(item, i, field));
}

function assertObject(
	raw: unknown,
	label: string,
): asserts raw is Record<string, unknown> {
	if (typeof raw !== "object" || raw === null) {
		throw new Error(`${label} must be an object`);
	}
}

function requireString(
	obj: Record<string, unknown>,
	key: string,
	label: string,
): string {
	if (typeof obj[key] !== "string") {
		throw new Error(`${label}.${key} must be a string`);
	}
	return obj[key];
}

function optionalString(
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

function optionalStringArray(
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

	const severity = optionalString(raw, "severity", label);
	if (severity !== undefined) {
		if (!SEVERITIES.includes(severity as Severity)) {
			throw new Error(`${label}.severity must be "error" or "warn"`);
		}
		rule.severity = severity as Severity;
	}

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
				return {
					pattern: requireString(c, "pattern", clabel),
					required: typeof c.required === "boolean" ? c.required : true,
				};
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

// --- Content config validation ---

function validateContentConfig(raw: unknown): ContentConfig {
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

	rule.pattern = optionalString(raw, "pattern", label);

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

	if (!rule.pattern && !rule.bom && !rule.invisible && !rule.secret) {
		throw new Error(
			`${label} must have at least one of: pattern, bom, invisible, secret`,
		);
	}

	rule.message = optionalString(raw, "message", label);

	const severity = optionalString(raw, "severity", label);
	if (severity !== undefined) {
		if (!SEVERITIES.includes(severity as Severity)) {
			throw new Error(`${label}.severity must be "error" or "warn"`);
		}
		rule.severity = severity as Severity;
	}

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

	const scope = optionalString(raw, "scope", label);
	if (scope !== undefined) {
		if (!CONTENT_REQUIRED_SCOPES.includes(scope as ContentRequiredScope)) {
			throw new Error(
				`${label}.scope must be one of: ${CONTENT_REQUIRED_SCOPES.join(", ")}`,
			);
		}
		rule.scope = scope as ContentRequiredScope;
	}

	rule.message = optionalString(raw, "message", label);

	return rule;
}
