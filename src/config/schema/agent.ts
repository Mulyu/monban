import type {
	AgentConfig,
	AgentIgnoreRule,
	AgentInstructionsRule,
	AgentMcpRule,
	AgentSettingsRule,
} from "../../types.js";
import {
	assertObject,
	optionalString,
	optionalStringArray,
	requireString,
	validateArray,
	validatePositiveInteger,
	validateSeverity,
} from "./common.js";

export function validateAgentConfig(raw: unknown): AgentConfig {
	if (typeof raw !== "object" || raw === null) {
		throw new Error("agent must be an object");
	}

	const obj = raw as Record<string, unknown>;
	const config: AgentConfig = {};

	if (obj.instructions !== undefined) {
		config.instructions = validateArray(
			obj.instructions,
			"agent.instructions",
			validateInstructionsRule,
		);
	}
	if (obj.mcp !== undefined) {
		config.mcp = validateArray(obj.mcp, "agent.mcp", validateMcpRule);
	}
	if (obj.settings !== undefined) {
		config.settings = validateArray(
			obj.settings,
			"agent.settings",
			validateSettingsRule,
		);
	}
	if (obj.ignore !== undefined) {
		config.ignore = validateArray(
			obj.ignore,
			"agent.ignore",
			validateIgnoreRule,
		);
	}

	return config;
}

function validateInstructionsRule(
	raw: unknown,
	index: number,
	field: string,
): AgentInstructionsRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: AgentInstructionsRule = {
		path: requireString(raw, "path", label),
	};
	const exclude = optionalStringArray(raw, "exclude", label);
	if (exclude !== undefined) rule.exclude = exclude;
	const required = optionalStringArray(raw, "required_sections", label);
	if (required !== undefined) rule.required_sections = required;
	const maxBytes = validatePositiveInteger(raw, "max_bytes", label);
	if (maxBytes !== undefined) rule.max_bytes = maxBytes;
	const fmKeys = optionalStringArray(raw, "allowed_frontmatter_keys", label);
	if (fmKeys !== undefined) rule.allowed_frontmatter_keys = fmKeys;
	const message = optionalString(raw, "message", label);
	if (message !== undefined) rule.message = message;
	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;

	return rule;
}

function validateMcpRule(
	raw: unknown,
	index: number,
	field: string,
): AgentMcpRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: AgentMcpRule = {
		path: requireString(raw, "path", label),
	};
	const exclude = optionalStringArray(raw, "exclude", label);
	if (exclude !== undefined) rule.exclude = exclude;
	const forbidden = optionalStringArray(raw, "forbidden_commands", label);
	if (forbidden !== undefined) rule.forbidden_commands = forbidden;
	if (raw.unpinned_npx !== undefined) {
		if (typeof raw.unpinned_npx !== "boolean") {
			throw new Error(`${label}.unpinned_npx must be a boolean`);
		}
		rule.unpinned_npx = raw.unpinned_npx;
	}
	if (raw.env_secrets !== undefined) {
		if (typeof raw.env_secrets !== "boolean") {
			throw new Error(`${label}.env_secrets must be a boolean`);
		}
		rule.env_secrets = raw.env_secrets;
	}
	const allowed = optionalStringArray(raw, "allowed_servers", label);
	if (allowed !== undefined) rule.allowed_servers = allowed;
	const forbiddenServers = optionalStringArray(raw, "forbidden_servers", label);
	if (forbiddenServers !== undefined) rule.forbidden_servers = forbiddenServers;
	const message = optionalString(raw, "message", label);
	if (message !== undefined) rule.message = message;
	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;

	return rule;
}

function validateSettingsRule(
	raw: unknown,
	index: number,
	field: string,
): AgentSettingsRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: AgentSettingsRule = {
		path: requireString(raw, "path", label),
	};
	const exclude = optionalStringArray(raw, "exclude", label);
	if (exclude !== undefined) rule.exclude = exclude;
	const allowedPerms = optionalStringArray(raw, "allowed_permissions", label);
	if (allowedPerms !== undefined) rule.allowed_permissions = allowedPerms;
	const forbiddenPerms = optionalStringArray(
		raw,
		"forbidden_permissions",
		label,
	);
	if (forbiddenPerms !== undefined) rule.forbidden_permissions = forbiddenPerms;
	const forbiddenHooks = optionalStringArray(
		raw,
		"forbidden_hook_commands",
		label,
	);
	if (forbiddenHooks !== undefined)
		rule.forbidden_hook_commands = forbiddenHooks;
	if (raw.unpinned_npx !== undefined) {
		if (typeof raw.unpinned_npx !== "boolean") {
			throw new Error(`${label}.unpinned_npx must be a boolean`);
		}
		rule.unpinned_npx = raw.unpinned_npx;
	}
	const message = optionalString(raw, "message", label);
	if (message !== undefined) rule.message = message;
	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;

	return rule;
}

function validateIgnoreRule(
	raw: unknown,
	index: number,
	field: string,
): AgentIgnoreRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: AgentIgnoreRule = {
		path: requireString(raw, "path", label),
	};
	const exclude = optionalStringArray(raw, "exclude", label);
	if (exclude !== undefined) rule.exclude = exclude;
	const required = optionalStringArray(raw, "required", label);
	if (required !== undefined) rule.required = required;
	const message = optionalString(raw, "message", label);
	if (message !== undefined) rule.message = message;
	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;

	return rule;
}
