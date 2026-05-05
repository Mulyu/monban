import type { MonbanConfig } from "../engine/types.js";
import { CHECKS } from "../rules/index.js";
import { optionalStringArray } from "./common.js";
import { validateExtends } from "./extends/validate.js";

export { validateExtends };

export function validateConfig(raw: unknown): MonbanConfig {
	if (raw === null || raw === undefined) {
		return {};
	}
	if (typeof raw !== "object") {
		throw new Error("monban.yml must be a YAML object");
	}

	const obj = raw as Record<string, unknown>;
	const config: Record<string, unknown> = {};

	if (obj.extends !== undefined) {
		config.extends = validateExtends(raw);
	}

	config.exclude = optionalStringArray(obj, "exclude", "monban.yml") ?? [];

	for (const check of CHECKS) {
		const raw = obj[check.category];
		if (raw !== undefined) {
			config[check.category] = check.validate(raw);
		}
	}

	return config as MonbanConfig;
}
