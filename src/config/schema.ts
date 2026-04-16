import type { ArchRule, MonbanConfig } from "../types.js";

export function validateConfig(raw: unknown): MonbanConfig {
	if (raw === null || raw === undefined) {
		return {};
	}
	if (typeof raw !== "object") {
		throw new Error("monban.yml must be a YAML object");
	}

	const obj = raw as Record<string, unknown>;
	const config: MonbanConfig = {};

	if (obj.arch !== undefined) {
		config.arch = validateArchConfig(obj.arch);
	}

	return config;
}

function validateArchConfig(raw: unknown): { rules: ArchRule[] } {
	if (typeof raw !== "object" || raw === null) {
		throw new Error("arch must be an object");
	}

	const obj = raw as Record<string, unknown>;
	if (!Array.isArray(obj.rules)) {
		throw new Error("arch.rules must be an array");
	}

	const rules = obj.rules.map((r, i) => validateArchRule(r, i));
	return { rules };
}

function validateArchRule(raw: unknown, index: number): ArchRule {
	if (typeof raw !== "object" || raw === null) {
		throw new Error(`arch.rules[${index}] must be an object`);
	}

	const obj = raw as Record<string, unknown>;
	if (typeof obj.path !== "string") {
		throw new Error(`arch.rules[${index}].path must be a string`);
	}

	const rule: ArchRule = { path: obj.path };

	if (obj.must_not_contain !== undefined) {
		if (typeof obj.must_not_contain !== "string") {
			throw new Error(`arch.rules[${index}].must_not_contain must be a string`);
		}
		rule.must_not_contain = obj.must_not_contain;
	}

	if (obj.required_files !== undefined) {
		if (
			!Array.isArray(obj.required_files) ||
			!obj.required_files.every((f) => typeof f === "string")
		) {
			throw new Error(
				`arch.rules[${index}].required_files must be a string array`,
			);
		}
		rule.required_files = obj.required_files;
	}

	return rule;
}
