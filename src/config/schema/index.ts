import type { MonbanConfig } from "../../engine/types.js";
import { validateAgentConfig } from "../../rules/agent/schema.js";
import { validateContentConfig } from "../../rules/content/schema.js";
import { validateDepsConfig } from "../../rules/deps/schema.js";
import { validateDocConfig } from "../../rules/doc/schema.js";
import { validateDockerConfig } from "../../rules/docker/schema.js";
import { validateGitConfig } from "../../rules/git/schema.js";
import { validateGithubConfig } from "../../rules/github/schema/index.js";
import { validateLicenseConfig } from "../../rules/license/schema.js";
import { validatePathConfig } from "../../rules/path/schema.js";
import { validateRuntimeConfig } from "../../rules/runtime/schema.js";
import { optionalStringArray } from "./common.js";
import { validateExtends } from "./extends.js";

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

	if (obj.git !== undefined) {
		config.git = validateGitConfig(obj.git);
	}

	if (obj.agent !== undefined) {
		config.agent = validateAgentConfig(obj.agent);
	}

	if (obj.runtime !== undefined) {
		config.runtime = validateRuntimeConfig(obj.runtime);
	}

	if (obj.license !== undefined) {
		config.license = validateLicenseConfig(obj.license);
	}

	if (obj.docker !== undefined) {
		config.docker = validateDockerConfig(obj.docker);
	}

	return config;
}
