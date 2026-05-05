import type { Severity } from "../../engine/types.js";

export type GitCommitMessagePreset = "conventional";

export interface GitCommitMessageRule {
	preset?: GitCommitMessagePreset;
	pattern?: string;
	subject_max_length?: number;
	subject_min_length?: number;
	body_min_length?: number;
	forbidden_subjects?: string[];
	ignore_merges?: boolean;
	ignore_reverts?: boolean;
	severity?: Severity;
}

export interface GitTrailerForbiddenEntry {
	key: string;
	value_pattern?: string;
	message?: string;
}

export interface GitTrailerRequiredEntry {
	key: string;
	message?: string;
}

export interface GitTrailerAllowedEntry {
	key: string;
}

export interface GitCommitTrailersRule {
	forbidden?: GitTrailerForbiddenEntry[];
	required?: GitTrailerRequiredEntry[];
	allowed?: GitTrailerAllowedEntry[];
	severity?: Severity;
}

export interface GitDiffSizeRule {
	max_files?: number;
	max_insertions?: number;
	max_deletions?: number;
	max_total_lines?: number;
	exclude?: string[];
	severity?: Severity;
}

export type GitDiffIgnoredScope = "diff" | "all";

export interface GitDiffIgnoredRule {
	scope?: GitDiffIgnoredScope;
	allowed?: string[];
	message?: string;
	severity?: Severity;
}

export type GitCommitReferencesScope = "all" | "any";

export interface GitCommitReferencesRule {
	required?: boolean;
	patterns?: string[];
	scope?: GitCommitReferencesScope;
	ignore_patterns?: string[];
	ignore_merges?: boolean;
	severity?: Severity;
}

export interface GitCommitConfig {
	message?: GitCommitMessageRule;
	trailers?: GitCommitTrailersRule;
	references?: GitCommitReferencesRule;
}

export interface GitDiffConfig {
	size?: GitDiffSizeRule;
	ignored?: GitDiffIgnoredRule;
}

export interface GitBranchNameRule {
	pattern?: string;
	allowed?: string[];
	forbidden?: string[];
	message?: string;
	severity?: Severity;
}

export interface GitTagNameRule {
	pattern?: string;
	allowed?: string[];
	forbidden?: string[];
	scope?: "all" | "recent";
	limit?: number;
	message?: string;
	severity?: Severity;
}

export interface GitConfig {
	commit?: GitCommitConfig;
	diff?: GitDiffConfig;
	branch_name?: GitBranchNameRule;
	tag_name?: GitTagNameRule;
}
