export type Severity = "error" | "warn";

export interface RuleResult {
	rule: string;
	path: string;
	message: string;
	severity: Severity;
}

export interface ArchRule {
	path: string;
	must_not_contain?: string;
	required_files?: string[];
}

export interface ArchConfig {
	rules: ArchRule[];
}

export interface MonbanConfig {
	arch?: ArchConfig;
}
