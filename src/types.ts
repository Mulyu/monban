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
	exclude?: string[];
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
	exclude?: string[];
	pattern: string;
	scope?: ContentRequiredScope;
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

// --- Deps config types ---

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

export interface DepsDeniedRule {
	path: string;
	names: string[];
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
	denied?: DepsDeniedRule[];
}

// --- Git config types ---

export type GitCommitMessagePreset = "conventional";

export interface GitCommitMessageRule {
	preset?: GitCommitMessagePreset;
	pattern?: string;
	subject_max_length?: number;
	subject_min_length?: number;
	body_min_length?: number;
	forbidden_subjects?: string[];
	ignore_merges?: boolean;
	ignore_reverts?: boolean;
	severity?: Severity;
}

export interface GitTrailerDenyEntry {
	key: string;
	value_pattern?: string;
	message?: string;
}

export interface GitTrailerRequireEntry {
	key: string;
	message?: string;
}

export interface GitTrailerAllowEntry {
	key: string;
}

export interface GitCommitTrailersRule {
	deny?: GitTrailerDenyEntry[];
	require?: GitTrailerRequireEntry[];
	allow?: GitTrailerAllowEntry[];
	severity?: Severity;
}

export interface GitDiffSizeRule {
	max_files?: number;
	max_insertions?: number;
	max_deletions?: number;
	max_total_lines?: number;
	exclude?: string[];
	severity?: Severity;
}

export type GitDiffIgnoredScope = "diff" | "all";

export interface GitDiffIgnoredRule {
	scope?: GitDiffIgnoredScope;
	allow?: string[];
	message?: string;
	severity?: Severity;
}

export type GitCommitReferencesScope = "all" | "any";

export interface GitCommitReferencesRule {
	required?: boolean;
	patterns?: string[];
	scope?: GitCommitReferencesScope;
	ignore_patterns?: string[];
	ignore_merges?: boolean;
	severity?: Severity;
}

export interface GitCommitConfig {
	message?: GitCommitMessageRule;
	trailers?: GitCommitTrailersRule;
	references?: GitCommitReferencesRule;
}

export interface GitDiffConfig {
	size?: GitDiffSizeRule;
	ignored?: GitDiffIgnoredRule;
}

export interface GitConfig {
	commit?: GitCommitConfig;
	diff?: GitDiffConfig;
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
	deps?: DepsConfig;
	git?: GitConfig;
}

// --- Diff scope types ---

export type DiffGranularity = "file" | "line";

export interface DiffScope {
	files: Set<string>;
	addedLines: Map<string, Set<number>>;
	granularity: DiffGranularity;
}
