import type { Severity } from "../../engine/types.js";

export interface RuntimeConsistencySource {
	path: string;
	pattern?: string;
	json_key?: string;
	yaml_key?: string;
}

export interface RuntimeConsistencyRule {
	name: string;
	sources: RuntimeConsistencySource[];
	message?: string;
	severity?: Severity;
}

export interface RuntimeConfig {
	consistency?: RuntimeConsistencyRule[];
}
