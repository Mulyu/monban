import type { Severity } from "../../types.js";

export interface DocRefRule {
	path: string;
}

export interface DocLinkRule {
	path: string;
	severity?: Severity;
}

export interface DocConfig {
	ref?: DocRefRule[];
	link?: DocLinkRule[];
}
