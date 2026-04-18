import type {
	CompanionDef,
	ContentConfig,
	ContentForbiddenRule,
	ContentRequiredRule,
	ContentRequiredScope,
	CountRule,
	DepsAllowedRule,
	DepsConfig,
	DepsCrossEcosystemRule,
	DepsDeniedRule,
	DepsExistenceRule,
	DepsFreshnessRule,
	DepsPopularityRule,
	DepsTyposquatRule,
	DepthRule,
	DocConfig,
	DocLinkRule,
	DocRefRule,
	ExtendsGitHub,
	ExtendsLocal,
	ExtendsSource,
	ForbiddenRule,
	GithubCodeownersRule,
	GithubConcurrencyRule,
	GithubConfig,
	GithubConsistencyRule,
	GithubForbiddenRule,
	GithubPermissionsRule,
	GithubPinnedRule,
	GithubPinnedTarget,
	GithubRequiredRule,
	GithubRunnerRule,
	GithubSecretsRule,
	GithubTimeoutRule,
	GithubTriggersRule,
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

export function validateExtends(raw: unknown): ExtendsSource[] {
	if (typeof raw !== "object" || raw === null) return [];
	const obj = raw as Record<string, unknown>;
	if (obj.extends === undefined) return [];
	return validateArray(obj.extends, "extends", validateExtendsSource);
}

export function validateConfig(raw: unknown): MonbanConfig {
	if (raw === null || raw === undefined) {
		return {};
	}
	if (typeof raw !== "object") {
		throw new Error("monban.yml must be a YAML object");
	}

	const obj = raw as Record<string, unknown>;
	const config: MonbanConfig = {};

	if (obj.extends !== undefined) {
		config.extends = validateArray(
			obj.extends,
			"extends",
			validateExtendsSource,
		);
	}

	config.exclude = optionalStringArray(obj, "exclude", "monban.yml") ?? [];

	if (obj.path !== undefined) {
		config.path = validatePathConfig(obj.path);
	}

	if (obj.content !== undefined) {
		config.content = validateContentConfig(obj.content);
	}

	if (obj.doc !== undefined) {
		config.doc = validateDocConfig(obj.doc);
	}

	if (obj.github !== undefined) {
		config.github = validateGithubConfig(obj.github);
	}

	if (obj.deps !== undefined) {
		config.deps = validateDepsConfig(obj.deps);
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

// --- Doc config validation ---

function validateDocConfig(raw: unknown): DocConfig {
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

// --- GitHub config validation ---

const PINNED_TARGETS: GithubPinnedTarget[] = ["action", "reusable", "docker"];

function validateGithubConfig(raw: unknown): GithubConfig {
	if (typeof raw !== "object" || raw === null) {
		throw new Error("github must be an object");
	}

	const obj = raw as Record<string, unknown>;
	const config: GithubConfig = {};

	if (obj.pinned !== undefined) {
		config.pinned = validateArray(
			obj.pinned,
			"github.pinned",
			validateGithubPinnedRule,
		);
	}
	if (obj.required !== undefined) {
		config.required = validateArray(
			obj.required,
			"github.required",
			validateGithubRequiredRule,
		);
	}
	if (obj.forbidden !== undefined) {
		config.forbidden = validateArray(
			obj.forbidden,
			"github.forbidden",
			validateGithubForbiddenRule,
		);
	}
	if (obj.permissions !== undefined) {
		config.permissions = validateArray(
			obj.permissions,
			"github.permissions",
			validateGithubPermissionsRule,
		);
	}
	if (obj.triggers !== undefined) {
		config.triggers = validateArray(
			obj.triggers,
			"github.triggers",
			validateGithubTriggersRule,
		);
	}
	if (obj.runner !== undefined) {
		config.runner = validateArray(
			obj.runner,
			"github.runner",
			validateGithubRunnerRule,
		);
	}
	if (obj.timeout !== undefined) {
		config.timeout = validateArray(
			obj.timeout,
			"github.timeout",
			validateGithubTimeoutRule,
		);
	}
	if (obj.concurrency !== undefined) {
		config.concurrency = validateArray(
			obj.concurrency,
			"github.concurrency",
			validateGithubConcurrencyRule,
		);
	}
	if (obj.consistency !== undefined) {
		config.consistency = validateArray(
			obj.consistency,
			"github.consistency",
			validateGithubConsistencyRule,
		);
	}
	if (obj.secrets !== undefined) {
		config.secrets = validateArray(
			obj.secrets,
			"github.secrets",
			validateGithubSecretsRule,
		);
	}
	if (obj.codeowners !== undefined) {
		config.codeowners = validateArray(
			obj.codeowners,
			"github.codeowners",
			validateGithubCodeownersRule,
		);
	}

	return config;
}

function validateGithubPinnedRule(
	raw: unknown,
	index: number,
	field: string,
): GithubPinnedRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: GithubPinnedRule = {
		path: requireString(raw, "path", label),
	};

	const targets = optionalStringArray(raw, "targets", label);
	if (targets !== undefined) {
		for (const t of targets) {
			if (!PINNED_TARGETS.includes(t as GithubPinnedTarget)) {
				throw new Error(
					`${label}.targets must contain only: ${PINNED_TARGETS.join(", ")}`,
				);
			}
		}
		rule.targets = targets as GithubPinnedTarget[];
	}

	return rule;
}

function validateGithubRequiredRule(
	raw: unknown,
	index: number,
	field: string,
): GithubRequiredRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: GithubRequiredRule = {};
	rule.file = optionalString(raw, "file", label);
	rule.path = optionalString(raw, "path", label);
	rule.steps = optionalStringArray(raw, "steps", label);

	if (!rule.file && !(rule.path && rule.steps)) {
		throw new Error(`${label} must have either "file" or "path" with "steps"`);
	}

	return rule;
}

function validateGithubForbiddenRule(
	raw: unknown,
	index: number,
	field: string,
): GithubForbiddenRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: GithubForbiddenRule = {
		path: requireString(raw, "path", label),
		uses: requireString(raw, "uses", label),
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

function validateGithubPermissionsRule(
	raw: unknown,
	index: number,
	field: string,
): GithubPermissionsRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: GithubPermissionsRule = {
		path: requireString(raw, "path", label),
	};

	if (raw.required !== undefined) {
		if (typeof raw.required !== "boolean") {
			throw new Error(`${label}.required must be a boolean`);
		}
		rule.required = raw.required;
	}
	const forbid = optionalStringArray(raw, "forbid", label);
	if (forbid !== undefined) rule.forbid = forbid;

	return rule;
}

function validateGithubTriggersRule(
	raw: unknown,
	index: number,
	field: string,
): GithubTriggersRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: GithubTriggersRule = {
		path: requireString(raw, "path", label),
	};
	const allowed = optionalStringArray(raw, "allowed", label);
	if (allowed !== undefined) rule.allowed = allowed;
	const forbidden = optionalStringArray(raw, "forbidden", label);
	if (forbidden !== undefined) rule.forbidden = forbidden;

	if (!rule.allowed && !rule.forbidden) {
		throw new Error(
			`${label} must have at least one of "allowed" or "forbidden"`,
		);
	}

	return rule;
}

function validateGithubRunnerRule(
	raw: unknown,
	index: number,
	field: string,
): GithubRunnerRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const allowed = optionalStringArray(raw, "allowed", label);
	if (!allowed || allowed.length === 0) {
		throw new Error(`${label}.allowed must be a non-empty string array`);
	}

	return {
		path: requireString(raw, "path", label),
		allowed,
	};
}

function validateGithubTimeoutRule(
	raw: unknown,
	index: number,
	field: string,
): GithubTimeoutRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	if (
		typeof raw.max !== "number" ||
		!Number.isInteger(raw.max) ||
		raw.max <= 0
	) {
		throw new Error(`${label}.max must be a positive integer`);
	}

	return {
		path: requireString(raw, "path", label),
		max: raw.max,
	};
}

function validateGithubConcurrencyRule(
	raw: unknown,
	index: number,
	field: string,
): GithubConcurrencyRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);
	return { path: requireString(raw, "path", label) };
}

function validateGithubConsistencyRule(
	raw: unknown,
	index: number,
	field: string,
): GithubConsistencyRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const actions = optionalStringArray(raw, "actions", label);
	if (!actions || actions.length === 0) {
		throw new Error(`${label}.actions must be a non-empty string array`);
	}

	return {
		path: requireString(raw, "path", label),
		actions,
	};
}

function validateGithubSecretsRule(
	raw: unknown,
	index: number,
	field: string,
): GithubSecretsRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const allowed = optionalStringArray(raw, "allowed", label);
	if (!allowed) {
		throw new Error(`${label}.allowed must be a string array`);
	}

	return {
		path: requireString(raw, "path", label),
		allowed,
	};
}

function validateGithubCodeownersRule(
	raw: unknown,
	index: number,
	field: string,
): GithubCodeownersRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const owners = optionalStringArray(raw, "owners", label);
	if (!owners || owners.length === 0) {
		throw new Error(`${label}.owners must be a non-empty string array`);
	}

	const rule: GithubCodeownersRule = {
		path: requireString(raw, "path", label),
		owners,
	};
	rule.message = optionalString(raw, "message", label);
	return rule;
}

// --- Extends validation ---

function validateExtendsSource(
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

// --- Deps config validation ---

function validateDepsConfig(raw: unknown): DepsConfig {
	if (typeof raw !== "object" || raw === null) {
		throw new Error("deps must be an object");
	}

	const obj = raw as Record<string, unknown>;
	const config: DepsConfig = {};

	if (obj.existence !== undefined) {
		config.existence = validateArray(
			obj.existence,
			"deps.existence",
			validateDepsExistenceRule,
		);
	}
	if (obj.freshness !== undefined) {
		config.freshness = validateArray(
			obj.freshness,
			"deps.freshness",
			validateDepsFreshnessRule,
		);
	}
	if (obj.popularity !== undefined) {
		config.popularity = validateArray(
			obj.popularity,
			"deps.popularity",
			validateDepsPopularityRule,
		);
	}
	if (obj.cross_ecosystem !== undefined) {
		config.cross_ecosystem = validateArray(
			obj.cross_ecosystem,
			"deps.cross_ecosystem",
			validateDepsCrossEcosystemRule,
		);
	}
	if (obj.typosquat !== undefined) {
		config.typosquat = validateArray(
			obj.typosquat,
			"deps.typosquat",
			validateDepsTyposquatRule,
		);
	}
	if (obj.allowed !== undefined) {
		config.allowed = validateArray(
			obj.allowed,
			"deps.allowed",
			validateDepsAllowedRule,
		);
	}
	if (obj.denied !== undefined) {
		config.denied = validateArray(
			obj.denied,
			"deps.denied",
			validateDepsDeniedRule,
		);
	}

	return config;
}

function validateSeverity(
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

function validatePositiveNumber(
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

function validatePositiveInteger(
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

function validateDepsExistenceRule(
	raw: unknown,
	index: number,
	field: string,
): DepsExistenceRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: DepsExistenceRule = {
		path: requireString(raw, "path", label),
	};
	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;
	const exclude = optionalStringArray(raw, "exclude", label);
	if (exclude !== undefined) rule.exclude = exclude;
	return rule;
}

function validateDepsFreshnessRule(
	raw: unknown,
	index: number,
	field: string,
): DepsFreshnessRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: DepsFreshnessRule = {
		path: requireString(raw, "path", label),
	};
	const hours = validatePositiveNumber(raw, "max_age_hours", label);
	if (hours !== undefined) rule.max_age_hours = hours;
	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;
	return rule;
}

function validateDepsPopularityRule(
	raw: unknown,
	index: number,
	field: string,
): DepsPopularityRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: DepsPopularityRule = {
		path: requireString(raw, "path", label),
	};
	const min = validatePositiveInteger(raw, "min_downloads", label);
	if (min !== undefined) rule.min_downloads = min;
	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;
	return rule;
}

function validateDepsCrossEcosystemRule(
	raw: unknown,
	index: number,
	field: string,
): DepsCrossEcosystemRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: DepsCrossEcosystemRule = {
		path: requireString(raw, "path", label),
	};
	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;
	return rule;
}

function validateDepsTyposquatRule(
	raw: unknown,
	index: number,
	field: string,
): DepsTyposquatRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: DepsTyposquatRule = {
		path: requireString(raw, "path", label),
	};
	const distance = validatePositiveInteger(raw, "max_distance", label);
	if (distance !== undefined) rule.max_distance = distance;
	const targets = optionalStringArray(raw, "targets", label);
	if (targets !== undefined) rule.targets = targets;
	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;
	return rule;
}

function validateDepsAllowedRule(
	raw: unknown,
	index: number,
	field: string,
): DepsAllowedRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const names = optionalStringArray(raw, "names", label);
	if (!names || names.length === 0) {
		throw new Error(`${label}.names must be a non-empty string array`);
	}

	const rule: DepsAllowedRule = {
		path: requireString(raw, "path", label),
		names,
	};
	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;
	return rule;
}

function validateDepsDeniedRule(
	raw: unknown,
	index: number,
	field: string,
): DepsDeniedRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const names = optionalStringArray(raw, "names", label);
	if (!names || names.length === 0) {
		throw new Error(`${label}.names must be a non-empty string array`);
	}

	const rule: DepsDeniedRule = {
		path: requireString(raw, "path", label),
		names,
	};
	const message = optionalString(raw, "message", label);
	if (message !== undefined) rule.message = message;
	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;
	return rule;
}
