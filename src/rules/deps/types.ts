import type { Severity } from "../../engine/types.js";

export type DepsEcosystem =
	| "npm"
	| "pypi"
	| "rubygems"
	| "cargo"
	| "go"
	| "github-actions";

export interface DepsExistenceRule {
	path: string;
	severity?: Severity;
	exclude?: string[];
}

export interface DepsFreshnessRule {
	path: string;
	max_age_hours?: number;
	severity?: Severity;
}

export interface DepsPopularityRule {
	path: string;
	min_downloads?: number;
	severity?: Severity;
}

export interface DepsCrossEcosystemRule {
	path: string;
	severity?: Severity;
}

export interface DepsTyposquatRule {
	path: string;
	max_distance?: number;
	targets?: string[];
	severity?: Severity;
}

export interface DepsAllowedRule {
	path: string;
	names: string[];
	severity?: Severity;
}

export interface DepsForbiddenRule {
	path: string;
	names: string[];
	message?: string;
	severity?: Severity;
}

export interface DepsInstallScriptsRule {
	path: string;
	exclude?: string[];
	forbidden?: string[];
	message?: string;
	severity?: Severity;
}

export interface DepsGitDependencyRule {
	path: string;
	exclude?: string[];
	message?: string;
	severity?: Severity;
}

export interface DepsFloatingVersionRule {
	path: string;
	exclude?: string[];
	allowed?: string[];
	message?: string;
	severity?: Severity;
}

export interface DepsConfig {
	existence?: DepsExistenceRule[];
	freshness?: DepsFreshnessRule[];
	popularity?: DepsPopularityRule[];
	cross_ecosystem?: DepsCrossEcosystemRule[];
	typosquat?: DepsTyposquatRule[];
	allowed?: DepsAllowedRule[];
	forbidden?: DepsForbiddenRule[];
	install_scripts?: DepsInstallScriptsRule[];
	git_dependency?: DepsGitDependencyRule[];
	floating_version?: DepsFloatingVersionRule[];
}
