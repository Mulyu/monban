import type { Severity } from "../../engine/types.js";

export interface DockerPinnedRule {
	path: string;
	exclude?: string[];
	digest?: boolean;
	message?: string;
	severity?: Severity;
}

export interface DockerUserRule {
	path: string;
	exclude?: string[];
	required?: boolean;
	forbidden?: string[];
	message?: string;
	severity?: Severity;
}

export interface DockerHealthcheckRule {
	path: string;
	exclude?: string[];
	required?: boolean;
	message?: string;
	severity?: Severity;
}

export interface DockerForbiddenInstruction {
	name: string;
	pattern?: string;
	message?: string;
}

export interface DockerForbiddenRule {
	path: string;
	exclude?: string[];
	instructions: DockerForbiddenInstruction[];
	severity?: Severity;
}

export interface DockerConfig {
	pinned?: DockerPinnedRule[];
	user?: DockerUserRule[];
	healthcheck?: DockerHealthcheckRule[];
	forbidden?: DockerForbiddenRule[];
}
