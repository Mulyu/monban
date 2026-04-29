import type {
	GithubCodeownersConfig,
	GithubCodeownersRule,
} from "../../../types.js";
import {
	assertObject,
	optionalString,
	optionalStringArray,
	requireString,
	validateArray,
} from "../common.js";

export function validateGithubCodeownersConfig(
	raw: unknown,
): GithubCodeownersConfig {
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
		throw new Error("github.codeowners must be an object");
	}

	const obj = raw as Record<string, unknown>;
	const config: GithubCodeownersConfig = {};

	if (obj.ownership !== undefined) {
		config.ownership = validateArray(
			obj.ownership,
			"github.codeowners.ownership",
			validateGithubCodeownersRule,
		);
	}

	return config;
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
