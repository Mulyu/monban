import {
	assertObject,
	optionalString,
	optionalStringArray,
	requireString,
	validateArray,
	validateSeverity,
} from "../../config/schema/common.js";
import type {
	DockerConfig,
	DockerForbiddenInstruction,
	DockerForbiddenRule,
	DockerHealthcheckRule,
	DockerPinnedRule,
	DockerUserRule,
} from "../../rules/docker/types.js";

export function validateDockerConfig(raw: unknown): DockerConfig {
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
		throw new Error("docker must be an object");
	}

	const obj = raw as Record<string, unknown>;
	const config: DockerConfig = {};

	if (obj.pinned !== undefined) {
		config.pinned = validateArray(
			obj.pinned,
			"docker.pinned",
			validatePinnedRule,
		);
	}
	if (obj.user !== undefined) {
		config.user = validateArray(obj.user, "docker.user", validateUserRule);
	}
	if (obj.healthcheck !== undefined) {
		config.healthcheck = validateArray(
			obj.healthcheck,
			"docker.healthcheck",
			validateHealthcheckRule,
		);
	}
	if (obj.forbidden !== undefined) {
		config.forbidden = validateArray(
			obj.forbidden,
			"docker.forbidden",
			validateForbiddenRule,
		);
	}

	return config;
}

function validatePinnedRule(
	raw: unknown,
	index: number,
	field: string,
): DockerPinnedRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: DockerPinnedRule = {
		path: requireString(raw, "path", label),
	};

	const exclude = optionalStringArray(raw, "exclude", label);
	if (exclude !== undefined) rule.exclude = exclude;

	if (raw.digest !== undefined) {
		if (typeof raw.digest !== "boolean") {
			throw new Error(`${label}.digest must be a boolean`);
		}
		rule.digest = raw.digest;
	}

	const message = optionalString(raw, "message", label);
	if (message !== undefined) rule.message = message;
	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;

	return rule;
}

function validateUserRule(
	raw: unknown,
	index: number,
	field: string,
): DockerUserRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: DockerUserRule = {
		path: requireString(raw, "path", label),
	};

	const exclude = optionalStringArray(raw, "exclude", label);
	if (exclude !== undefined) rule.exclude = exclude;

	if (raw.required !== undefined) {
		if (typeof raw.required !== "boolean") {
			throw new Error(`${label}.required must be a boolean`);
		}
		rule.required = raw.required;
	}

	const forbidden = optionalStringArray(raw, "forbidden", label);
	if (forbidden !== undefined) rule.forbidden = forbidden;

	const message = optionalString(raw, "message", label);
	if (message !== undefined) rule.message = message;
	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;

	return rule;
}

function validateHealthcheckRule(
	raw: unknown,
	index: number,
	field: string,
): DockerHealthcheckRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: DockerHealthcheckRule = {
		path: requireString(raw, "path", label),
	};

	const exclude = optionalStringArray(raw, "exclude", label);
	if (exclude !== undefined) rule.exclude = exclude;

	if (raw.required !== undefined) {
		if (typeof raw.required !== "boolean") {
			throw new Error(`${label}.required must be a boolean`);
		}
		rule.required = raw.required;
	}

	const message = optionalString(raw, "message", label);
	if (message !== undefined) rule.message = message;
	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;

	return rule;
}

function validateForbiddenRule(
	raw: unknown,
	index: number,
	field: string,
): DockerForbiddenRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	if (!Array.isArray(raw.instructions)) {
		throw new Error(`${label}.instructions must be an array`);
	}
	const instructions = raw.instructions.map((item, i) =>
		validateForbiddenInstruction(item, i, `${label}.instructions`),
	);
	if (instructions.length === 0) {
		throw new Error(`${label}.instructions must contain at least one entry`);
	}

	const rule: DockerForbiddenRule = {
		path: requireString(raw, "path", label),
		instructions,
	};

	const exclude = optionalStringArray(raw, "exclude", label);
	if (exclude !== undefined) rule.exclude = exclude;
	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;

	return rule;
}

function validateForbiddenInstruction(
	raw: unknown,
	index: number,
	field: string,
): DockerForbiddenInstruction {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const name = requireString(raw, "name", label);
	if (!/^[A-Z][A-Z0-9_]*$/.test(name)) {
		throw new Error(
			`${label}.name must be an uppercase Dockerfile instruction (e.g. ADD, RUN)`,
		);
	}

	const entry: DockerForbiddenInstruction = { name };
	const pattern = optionalString(raw, "pattern", label);
	if (pattern !== undefined) entry.pattern = pattern;
	const message = optionalString(raw, "message", label);
	if (message !== undefined) entry.message = message;
	return entry;
}
