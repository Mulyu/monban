import type { Severity } from "../../engine/types.js";

export type PathEntryType = "file" | "directory" | "symlink";

export interface ForbiddenRule {
	path: string;
	type?: PathEntryType;
	message?: string;
	severity?: Severity;
}

export interface CompanionDef {
	pattern: string;
	required: boolean;
	root?: boolean;
}

export interface RequiredRule {
	path: string;
	exclude?: string[];
	files?: string[];
	companions?: CompanionDef[];
}

export type NamingStyle = "pascal" | "camel" | "kebab" | "snake";

export interface NamingRule {
	path: string;
	target?: "file" | "directory";
	style: NamingStyle;
	prefix?: string;
	suffix?: string;
	severity?: Severity;
}

export interface DepthRule {
	path: string;
	max: number;
}

export interface CountRule {
	path: string;
	max?: number;
	min?: number;
	exclude?: string[];
}

export interface PathHashRule {
	path: string;
	sha256: string;
	message?: string;
	severity?: Severity;
}

export interface PathSizeRule {
	path: string;
	exclude?: string[];
	max_bytes: number;
	message?: string;
	severity?: Severity;
}

export interface PathCaseConflictRule {
	path: string;
	exclude?: string[];
	message?: string;
	severity?: Severity;
}

export interface PathConfig {
	forbidden?: ForbiddenRule[];
	required?: RequiredRule[];
	naming?: NamingRule[];
	depth?: DepthRule[];
	count?: CountRule[];
	hash?: PathHashRule[];
	size?: PathSizeRule[];
	case_conflict?: PathCaseConflictRule[];
}
