import type { Severity } from "../../types.js";

export interface LicenseFileRule {
	path: string;
	allowed?: string[];
	message?: string;
	severity?: Severity;
}

export interface LicenseHeaderRule {
	path: string;
	exclude?: string[];
	allowed?: string[];
	within_lines?: number;
	message?: string;
	severity?: Severity;
}

export interface LicenseConfig {
	file?: LicenseFileRule[];
	header?: LicenseHeaderRule[];
}
