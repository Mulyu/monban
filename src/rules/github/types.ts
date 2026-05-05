import type { Severity } from "../../engine/types.js";

export type GithubPinnedTarget = "action" | "reusable" | "docker";

export interface GithubPinnedRule {
	path: string;
	targets?: GithubPinnedTarget[];
}

export interface GithubRequiredRule {
	file?: string;
	path?: string;
	steps?: string[];
}

export interface GithubForbiddenRule {
	path: string;
	uses: string | string[];
	message?: string;
	severity?: Severity;
}

export interface GithubPermissionsRule {
	path: string;
	required?: boolean;
	forbidden?: string[];
	severity?: Severity;
}

export interface GithubTriggersRule {
	path: string;
	allowed?: string[];
	forbidden?: string[];
}

export interface GithubRunnerRule {
	path: string;
	allowed?: string[];
	forbidden?: string[];
}

export interface GithubTimeoutRule {
	path: string;
	max: number;
	severity?: Severity;
}

export interface GithubConcurrencyRule {
	path: string;
	severity?: Severity;
}

export interface GithubConsistencyRule {
	path: string;
	actions: string[];
}

export interface GithubSecretsRule {
	path: string;
	allowed?: string[];
	forbidden?: string[];
}

export interface GithubCodeownersRule {
	path: string;
	owners: string[];
	message?: string;
}

export interface GithubActionsDangerRule {
	path: string;
	severity?: Severity;
}

export interface GithubActionsInjectionRule {
	path: string;
	severity?: Severity;
	allowed_contexts?: string[];
}

export interface GithubActionsConfig {
	pinned?: GithubPinnedRule[];
	required?: GithubRequiredRule[];
	forbidden?: GithubForbiddenRule[];
	permissions?: GithubPermissionsRule[];
	triggers?: GithubTriggersRule[];
	runner?: GithubRunnerRule[];
	timeout?: GithubTimeoutRule[];
	concurrency?: GithubConcurrencyRule[];
	consistency?: GithubConsistencyRule[];
	secrets?: GithubSecretsRule[];
	danger?: GithubActionsDangerRule[];
	injection?: GithubActionsInjectionRule[];
}

export interface GithubCodeownersConfig {
	ownership?: GithubCodeownersRule[];
}

export interface GithubConfig {
	actions?: GithubActionsConfig;
	codeowners?: GithubCodeownersConfig;
}
