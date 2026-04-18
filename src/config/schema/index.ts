import type { MonbanConfig } from "../../types.js";
import { optionalStringArray } from "./common.js";
import { validateContentConfig } from "./content.js";
import { validateDepsConfig } from "./deps.js";
import { validateDocConfig } from "./doc.js";
import { validateExtends } from "./extends.js";
import { validateGithubConfig } from "./github.js";
import { validatePathConfig } from "./path.js";

export { validateExtends };

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
		config.extends = validateExtends(raw);
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
