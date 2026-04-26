import {
	RUNTIME_PRESET_NAMES,
	RUNTIME_PRESETS,
} from "../../rules/runtime/presets.js";
import type {
	RuntimeConfig,
	RuntimeConsistencyRule,
	RuntimeConsistencySource,
} from "../../types.js";
import {
	assertObject,
	optionalString,
	requireString,
	validateArray,
	validateSeverity,
} from "./common.js";

export function validateRuntimeConfig(raw: unknown): RuntimeConfig {
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
		throw new Error("runtime must be an object");
	}

	const obj = raw as Record<string, unknown>;
	const config: RuntimeConfig = {};

	if (obj.consistency !== undefined) {
		config.consistency = validateArray(
			obj.consistency,
			"runtime.consistency",
			validateRuntimeConsistencyRule,
		);
	}

	return config;
}

function validateRuntimeConsistencyRule(
	raw: unknown,
	index: number,
	field: string,
): RuntimeConsistencyRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const preset = optionalString(raw, "preset", label);
	if (preset !== undefined && !(preset in RUNTIME_PRESETS)) {
		throw new Error(
			`${label}.preset must be one of: ${RUNTIME_PRESET_NAMES.join(", ")}`,
		);
	}

	const userName = optionalString(raw, "name", label);
	const name = userName ?? preset;
	if (name === undefined) {
		throw new Error(`${label} must have either "name" or "preset"`);
	}

	let userSources: RuntimeConsistencySource[] = [];
	if (raw.sources !== undefined) {
		if (!Array.isArray(raw.sources)) {
			throw new Error(`${label}.sources must be an array`);
		}
		userSources = raw.sources.map((item, i) =>
			validateRuntimeConsistencySource(item, i, `${label}.sources`),
		);
	}

	const presetSources = preset !== undefined ? RUNTIME_PRESETS[preset] : [];
	const sources = [...presetSources, ...userSources];

	if (sources.length === 0) {
		throw new Error(`${label}.sources must contain at least one source`);
	}

	const rule: RuntimeConsistencyRule = { name, sources };
	const message = optionalString(raw, "message", label);
	if (message !== undefined) rule.message = message;
	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;
	return rule;
}

function validateRuntimeConsistencySource(
	raw: unknown,
	index: number,
	field: string,
): RuntimeConsistencySource {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const source: RuntimeConsistencySource = {
		path: requireString(raw, "path", label),
	};

	const pattern = optionalString(raw, "pattern", label);
	const json_key = optionalString(raw, "json_key", label);
	const yaml_key = optionalString(raw, "yaml_key", label);

	const set = [pattern, json_key, yaml_key].filter((v) => v !== undefined);
	if (set.length > 1) {
		throw new Error(
			`${label} must have at most one of "pattern", "json_key", or "yaml_key"`,
		);
	}

	if (pattern !== undefined) source.pattern = pattern;
	if (json_key !== undefined) source.json_key = json_key;
	if (yaml_key !== undefined) source.yaml_key = yaml_key;

	return source;
}
