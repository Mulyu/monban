export type Severity = "error" | "warn";

export interface RuleResult {
	rule: string;
	path: string;
	message: string;
	severity: Severity;
}

// --- Path config types ---

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

// --- Content config types ---

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

// --- Doc config types ---

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

export interface DepsForbiddenRule {
	path: string;
	names: string[];
	message?: string;
	severity?: Severity;
}

export interface DepsInstallScriptsRule {
	path: string;
	exclude?: string[];
	forbidden?: string[];
	message?: string;
	severity?: Severity;
}

export interface DepsGitDependencyRule {
	path: string;
	exclude?: string[];
	message?: string;
	severity?: Severity;
}

export interface DepsFloatingVersionRule {
	path: string;
	exclude?: string[];
	allowed?: string[];
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
	forbidden?: DepsForbiddenRule[];
	install_scripts?: DepsInstallScriptsRule[];
	git_dependency?: DepsGitDependencyRule[];
	floating_version?: DepsFloatingVersionRule[];
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

export interface GitTrailerForbiddenEntry {
	key: string;
	value_pattern?: string;
	message?: string;
}

export interface GitTrailerRequiredEntry {
	key: string;
	message?: string;
}

export interface GitTrailerAllowedEntry {
	key: string;
}

export interface GitCommitTrailersRule {
	forbidden?: GitTrailerForbiddenEntry[];
	required?: GitTrailerRequiredEntry[];
	allowed?: GitTrailerAllowedEntry[];
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
	allowed?: string[];
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

export interface GitBranchNameRule {
	pattern?: string;
	allowed?: string[];
	forbidden?: string[];
	message?: string;
	severity?: Severity;
}

export interface GitTagNameRule {
	pattern?: string;
	allowed?: string[];
	forbidden?: string[];
	scope?: "all" | "recent";
	limit?: number;
	message?: string;
	severity?: Severity;
}

export interface GitConfig {
	commit?: GitCommitConfig;
	diff?: GitDiffConfig;
	branch_name?: GitBranchNameRule;
	tag_name?: GitTagNameRule;
}

// --- Agent config types ---

export interface AgentInstructionsRule {
	path: string;
	exclude?: string[];
	required_sections?: string[];
	max_bytes?: number;
	allowed_frontmatter_keys?: string[];
	message?: string;
	severity?: Severity;
}

export interface AgentMcpRule {
	path: string;
	exclude?: string[];
	forbidden_commands?: string[];
	unpinned_npx?: boolean;
	env_secrets?: boolean;
	allowed_servers?: string[];
	forbidden_servers?: string[];
	message?: string;
	severity?: Severity;
}

export interface AgentIgnoreRule {
	path: string;
	exclude?: string[];
	required?: string[];
	message?: string;
	severity?: Severity;
}

export interface AgentSettingsRule {
	path: string;
	exclude?: string[];
	allowed_permissions?: string[];
	forbidden_permissions?: string[];
	forbidden_hook_commands?: string[];
	unpinned_npx?: boolean;
	message?: string;
	severity?: Severity;
}

export interface AgentConfig {
	instructions?: AgentInstructionsRule[];
	mcp?: AgentMcpRule[];
	ignore?: AgentIgnoreRule[];
	settings?: AgentSettingsRule[];
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
	agent?: AgentConfig;
}

// --- Diff scope types ---

export type DiffGranularity = "file" | "line";

export interface DiffScope {
	files: Set<string>;
	addedLines: Map<string, Set<number>>;
	granularity: DiffGranularity;
}
