import type {
	GitCommitConfig,
	GitCommitMessagePreset,
	GitCommitMessageRule,
	GitCommitTrailersRule,
	GitConfig,
	GitDiffConfig,
	GitDiffIgnoredRule,
	GitDiffIgnoredScope,
	GitDiffSizeRule,
	GitTrailerAllowEntry,
	GitTrailerDenyEntry,
	GitTrailerRequireEntry,
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

const PRESETS: GitCommitMessagePreset[] = ["conventional"];
const IGNORED_SCOPES: GitDiffIgnoredScope[] = ["diff", "all"];

export function validateGitConfig(raw: unknown): GitConfig {
	if (typeof raw !== "object" || raw === null) {
		throw new Error("git must be an object");
	}

	const obj = raw as Record<string, unknown>;
	const config: GitConfig = {};

	if (obj.commit !== undefined) {
		config.commit = validateGitCommitConfig(obj.commit);
	}
	if (obj.diff !== undefined) {
		config.diff = validateGitDiffConfig(obj.diff);
	}

	return config;
}

function validateGitCommitConfig(raw: unknown): GitCommitConfig {
	assertObject(raw, "git.commit");
	const config: GitCommitConfig = {};

	if (raw.message !== undefined) {
		config.message = validateCommitMessageRule(raw.message);
	}
	if (raw.trailers !== undefined) {
		config.trailers = validateCommitTrailersRule(raw.trailers);
	}

	return config;
}

function validateGitDiffConfig(raw: unknown): GitDiffConfig {
	assertObject(raw, "git.diff");
	const config: GitDiffConfig = {};

	if (raw.size !== undefined) {
		config.size = validateDiffSizeRule(raw.size);
	}
	if (raw.ignored !== undefined) {
		config.ignored = validateDiffIgnoredRule(raw.ignored);
	}

	return config;
}

function validateCommitMessageRule(raw: unknown): GitCommitMessageRule {
	const label = "git.commit.message";
	assertObject(raw, label);

	const rule: GitCommitMessageRule = {};

	const preset = optionalString(raw, "preset", label);
	if (preset !== undefined) {
		if (!PRESETS.includes(preset as GitCommitMessagePreset)) {
			throw new Error(`${label}.preset must be one of: ${PRESETS.join(", ")}`);
		}
		rule.preset = preset as GitCommitMessagePreset;
	}

	const pattern = optionalString(raw, "pattern", label);
	if (pattern !== undefined) rule.pattern = pattern;

	const subjectMaxLength = validatePositiveInteger(
		raw,
		"subject_max_length",
		label,
	);
	if (subjectMaxLength !== undefined)
		rule.subject_max_length = subjectMaxLength;

	const subjectMinLength = validatePositiveInteger(
		raw,
		"subject_min_length",
		label,
	);
	if (subjectMinLength !== undefined)
		rule.subject_min_length = subjectMinLength;

	if (raw.body_min_length !== undefined) {
		const value = raw.body_min_length;
		if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
			throw new Error(
				`${label}.body_min_length must be a non-negative integer`,
			);
		}
		rule.body_min_length = value;
	}

	const forbiddenSubjects = optionalStringArray(
		raw,
		"forbidden_subjects",
		label,
	);
	if (forbiddenSubjects !== undefined)
		rule.forbidden_subjects = forbiddenSubjects;

	const ignoreMerges = optionalBoolean(raw, "ignore_merges", label);
	if (ignoreMerges !== undefined) rule.ignore_merges = ignoreMerges;

	const ignoreReverts = optionalBoolean(raw, "ignore_reverts", label);
	if (ignoreReverts !== undefined) rule.ignore_reverts = ignoreReverts;

	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;

	return rule;
}

function validateCommitTrailersRule(raw: unknown): GitCommitTrailersRule {
	const label = "git.commit.trailers";
	assertObject(raw, label);

	const rule: GitCommitTrailersRule = {};

	if (raw.deny !== undefined) {
		rule.deny = validateArray(raw.deny, `${label}.deny`, validateDenyEntry);
	}
	if (raw.require !== undefined) {
		rule.require = validateArray(
			raw.require,
			`${label}.require`,
			validateRequireEntry,
		);
	}
	if (raw.allow !== undefined) {
		rule.allow = validateArray(raw.allow, `${label}.allow`, validateAllowEntry);
	}

	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;

	return rule;
}

function validateDenyEntry(
	raw: unknown,
	index: number,
	field: string,
): GitTrailerDenyEntry {
	const label = `${field}[${index}]`;
	assertObject(raw, label);
	const entry: GitTrailerDenyEntry = {
		key: requireString(raw, "key", label),
	};
	const valuePattern = optionalString(raw, "value_pattern", label);
	if (valuePattern !== undefined) entry.value_pattern = valuePattern;
	const message = optionalString(raw, "message", label);
	if (message !== undefined) entry.message = message;
	return entry;
}

function validateRequireEntry(
	raw: unknown,
	index: number,
	field: string,
): GitTrailerRequireEntry {
	const label = `${field}[${index}]`;
	assertObject(raw, label);
	const entry: GitTrailerRequireEntry = {
		key: requireString(raw, "key", label),
	};
	const message = optionalString(raw, "message", label);
	if (message !== undefined) entry.message = message;
	return entry;
}

function validateAllowEntry(
	raw: unknown,
	index: number,
	field: string,
): GitTrailerAllowEntry {
	const label = `${field}[${index}]`;
	assertObject(raw, label);
	return { key: requireString(raw, "key", label) };
}

function validateDiffSizeRule(raw: unknown): GitDiffSizeRule {
	const label = "git.diff.size";
	assertObject(raw, label);

	const rule: GitDiffSizeRule = {};
	const maxFiles = validatePositiveInteger(raw, "max_files", label);
	if (maxFiles !== undefined) rule.max_files = maxFiles;
	const maxInsertions = validatePositiveInteger(raw, "max_insertions", label);
	if (maxInsertions !== undefined) rule.max_insertions = maxInsertions;
	const maxDeletions = validatePositiveInteger(raw, "max_deletions", label);
	if (maxDeletions !== undefined) rule.max_deletions = maxDeletions;
	const maxTotalLines = validatePositiveInteger(raw, "max_total_lines", label);
	if (maxTotalLines !== undefined) rule.max_total_lines = maxTotalLines;

	const exclude = optionalStringArray(raw, "exclude", label);
	if (exclude !== undefined) rule.exclude = exclude;

	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;

	return rule;
}

function validateDiffIgnoredRule(raw: unknown): GitDiffIgnoredRule {
	const label = "git.diff.ignored";
	assertObject(raw, label);

	const rule: GitDiffIgnoredRule = {};

	const scope = optionalString(raw, "scope", label);
	if (scope !== undefined) {
		if (!IGNORED_SCOPES.includes(scope as GitDiffIgnoredScope)) {
			throw new Error(
				`${label}.scope must be one of: ${IGNORED_SCOPES.join(", ")}`,
			);
		}
		rule.scope = scope as GitDiffIgnoredScope;
	}

	const allow = optionalStringArray(raw, "allow", label);
	if (allow !== undefined) rule.allow = allow;

	const message = optionalString(raw, "message", label);
	if (message !== undefined) rule.message = message;

	const severity = validateSeverity(raw, label);
	if (severity !== undefined) rule.severity = severity;

	return rule;
}

function optionalBoolean(
	raw: Record<string, unknown>,
	key: string,
	label: string,
): boolean | undefined {
	if (raw[key] === undefined) return undefined;
	if (typeof raw[key] !== "boolean") {
		throw new Error(`${label}.${key} must be a boolean`);
	}
	return raw[key];
}
