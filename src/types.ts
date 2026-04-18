export type Severity = "error" | "warn";

export interface RuleResult {
	rule: string;
	path: string;
	message: string;
	severity: Severity;
}

// --- Path config types ---

export interface ForbiddenRule {
	path: string;
	message?: string;
	severity?: Severity;
}

export interface CompanionDef {
	pattern: string;
	required: boolean;
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
}

export interface DepthRule {
	path: string;
	max: number;
}

export interface CountRule {
	path: string;
	max: number;
	exclude?: string[];
}

export interface PathConfig {
	forbidden?: ForbiddenRule[];
	required?: RequiredRule[];
	naming?: NamingRule[];
	depth?: DepthRule[];
	count?: CountRule[];
}

// --- Content config types ---

export interface ContentForbiddenRule {
	path: string;
	pattern?: string;
	bom?: boolean;
	invisible?: boolean;
	secret?: boolean;
	message?: string;
	severity?: Severity;
}

export type ContentRequiredScope = "file" | "first_line" | "last_line";

export interface ContentRequiredRule {
	path: string;
	pattern: string;
	scope?: ContentRequiredScope;
	message?: string;
}

export interface ContentConfig {
	forbidden?: ContentForbiddenRule[];
	required?: ContentRequiredRule[];
}

// --- Doc config types ---

export interface DocRefRule {
	path: string;
}

export interface DocLinkRule {
	path: string;
}

export interface DocConfig {
	ref?: DocRefRule[];
	link?: DocLinkRule[];
}

// --- GitHub config types ---

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
	uses: string;
	message?: string;
	severity?: Severity;
}

export interface GithubPermissionsRule {
	path: string;
	required?: boolean;
	forbid?: string[];
}

export interface GithubTriggersRule {
	path: string;
	allowed?: string[];
	forbidden?: string[];
}

export interface GithubRunnerRule {
	path: string;
	allowed: string[];
}

export interface GithubTimeoutRule {
	path: string;
	max: number;
}

export interface GithubConcurrencyRule {
	path: string;
}

export interface GithubConsistencyRule {
	path: string;
	actions: string[];
}

export interface GithubSecretsRule {
	path: string;
	allowed: string[];
}

export interface GithubCodeownersRule {
	path: string;
	owners: string[];
	message?: string;
}

export interface GithubConfig {
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
	codeowners?: GithubCodeownersRule[];
}

// --- Extends types ---

export interface ExtendsLocal {
	type: "local";
	path: string;
}

export interface ExtendsGitHub {
	type: "github";
	repo: string;
	ref?: string;
	path: string;
}

export type ExtendsSource = ExtendsLocal | ExtendsGitHub;

export interface MonbanConfig {
	extends?: ExtendsSource[];
	exclude?: string[];
	path?: PathConfig;
	content?: ContentConfig;
	doc?: DocConfig;
	github?: GithubConfig;
}
