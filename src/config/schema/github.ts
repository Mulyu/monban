import type {
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
} from "../../types.js";
import {
	assertObject,
	optionalString,
	optionalStringArray,
	PINNED_TARGETS,
	requireString,
	validateArray,
	validateSeverity,
} from "./common.js";

export function validateGithubConfig(raw: unknown): GithubConfig {
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

	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;

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
