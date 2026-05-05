import type { Severity } from "../../engine/types.js";

export interface ContentForbiddenRule {
	path: string;
	exclude?: string[];
	pattern?: string;
	json_key?: string;
	bom?: boolean;
	invisible?: boolean;
	secret?: boolean;
	injection?: boolean;
	conflict?: boolean;
	message?: string;
	severity?: Severity;
}

export type ContentRequiredScope = "file" | "first_line" | "last_line";

export interface ContentRequiredRule {
	path: string;
	exclude?: string[];
	pattern: string;
	json_key?: string;
	scope?: ContentRequiredScope;
	within_lines?: number;
	message?: string;
}

export interface ContentSizeRule {
	path: string;
	exclude?: string[];
	max_lines: number;
	message?: string;
	severity?: Severity;
}

export interface ContentConfig {
	forbidden?: ContentForbiddenRule[];
	required?: ContentRequiredRule[];
	size?: ContentSizeRule[];
}
