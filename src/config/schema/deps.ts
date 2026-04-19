import type {
	DepsAllowedRule,
	DepsConfig,
	DepsCrossEcosystemRule,
	DepsExistenceRule,
	DepsFloatingVersionRule,
	DepsForbiddenRule,
	DepsFreshnessRule,
	DepsGitDependencyRule,
	DepsInstallScriptsRule,
	DepsPopularityRule,
	DepsTyposquatRule,
} from "../../types.js";
import {
	assertObject,
	optionalString,
	optionalStringArray,
	requireString,
	validateArray,
	validatePositiveInteger,
	validatePositiveNumber,
	validateSeverity,
} from "./common.js";

export function validateDepsConfig(raw: unknown): DepsConfig {
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
	if (obj.forbidden !== undefined) {
		config.forbidden = validateArray(
			obj.forbidden,
			"deps.forbidden",
			validateDepsForbiddenRule,
		);
	}
	if (obj.install_scripts !== undefined) {
		config.install_scripts = validateArray(
			obj.install_scripts,
			"deps.install_scripts",
			validateDepsInstallScriptsRule,
		);
	}
	if (obj.git_dependency !== undefined) {
		config.git_dependency = validateArray(
			obj.git_dependency,
			"deps.git_dependency",
			validateDepsGitDependencyRule,
		);
	}
	if (obj.floating_version !== undefined) {
		config.floating_version = validateArray(
			obj.floating_version,
			"deps.floating_version",
			validateDepsFloatingVersionRule,
		);
	}

	return config;
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

function validateDepsForbiddenRule(
	raw: unknown,
	index: number,
	field: string,
): DepsForbiddenRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const names = optionalStringArray(raw, "names", label);
	if (!names || names.length === 0) {
		throw new Error(`${label}.names must be a non-empty string array`);
	}

	const rule: DepsForbiddenRule = {
		path: requireString(raw, "path", label),
		names,
	};
	const message = optionalString(raw, "message", label);
	if (message !== undefined) rule.message = message;
	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;
	return rule;
}

function validateDepsInstallScriptsRule(
	raw: unknown,
	index: number,
	field: string,
): DepsInstallScriptsRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: DepsInstallScriptsRule = {
		path: requireString(raw, "path", label),
	};
	const exclude = optionalStringArray(raw, "exclude", label);
	if (exclude !== undefined) rule.exclude = exclude;
	const hooks = optionalStringArray(raw, "hooks", label);
	if (hooks !== undefined) {
		if (hooks.length === 0) {
			throw new Error(`${label}.hooks must be a non-empty string array`);
		}
		rule.hooks = hooks;
	}
	const message = optionalString(raw, "message", label);
	if (message !== undefined) rule.message = message;
	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;
	return rule;
}

function validateDepsGitDependencyRule(
	raw: unknown,
	index: number,
	field: string,
): DepsGitDependencyRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: DepsGitDependencyRule = {
		path: requireString(raw, "path", label),
	};
	const exclude = optionalStringArray(raw, "exclude", label);
	if (exclude !== undefined) rule.exclude = exclude;
	const message = optionalString(raw, "message", label);
	if (message !== undefined) rule.message = message;
	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;
	return rule;
}

function validateDepsFloatingVersionRule(
	raw: unknown,
	index: number,
	field: string,
): DepsFloatingVersionRule {
	const label = `${field}[${index}]`;
	assertObject(raw, label);

	const rule: DepsFloatingVersionRule = {
		path: requireString(raw, "path", label),
	};
	const exclude = optionalStringArray(raw, "exclude", label);
	if (exclude !== undefined) rule.exclude = exclude;
	const message = optionalString(raw, "message", label);
	if (message !== undefined) rule.message = message;
	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;
	return rule;
}
