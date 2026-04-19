export type Severity = "error" | "warn";

export interface Remediation {
	fail_text?: string;
	docs_url?: string;
}

/** Hints attached at config time and propagated to every result the rule produces. */
export interface RuleHints {
	fail_text?: string;
	docs_url?: string;
}

export interface RuleResult {
	rule: string;
	path: string;
	message: string;
	severity: Severity;
	fail_text?: string;
	docs_url?: string;
}

// --- Path config types ---

export type PathEntryType = "file" | "directory" | "symlink";

export interface ForbiddenRule extends RuleHints {
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

export interface RequiredRule extends RuleHints {
	path: string;
	exclude?: string[];
	files?: string[];
	companions?: CompanionDef[];
}

export type NamingStyle = "pascal" | "camel" | "kebab" | "snake";

export interface NamingRule extends RuleHints {
	path: string;
	target?: "file" | "directory";
	style: NamingStyle;
	prefix?: string;
	suffix?: string;
}

export interface DepthRule extends RuleHints {
	path: string;
	max: number;
}

export interface CountRule extends RuleHints {
	path: string;
	max?: number;
	min?: number;
	exclude?: string[];
}

export interface PathHashRule extends RuleHints {
	path: string;
	sha256: string;
	message?: string;
	severity?: Severity;
}

export interface PathSizeRule extends RuleHints {
	path: string;
	exclude?: string[];
	max_bytes: number;
	message?: string;
	severity?: Severity;
}

export interface PathCaseConflictRule extends RuleHints {
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

export interface ContentForbiddenRule extends RuleHints {
	path: string;
	exclude?: string[];
	pattern?: string;
	bom?: boolean;
	invisible?: boolean;
	secret?: boolean;
	injection?: boolean;
	conflict?: boolean;
	message?: string;
	severity?: Severity;
}

export type ContentRequiredScope = "file" | "first_line" | "last_line";

export interface ContentRequiredRule extends RuleHints {
	path: string;
	exclude?: string[];
	pattern: string;
	scope?: ContentRequiredScope;
	within_lines?: number;
	message?: string;
}

export interface ContentSizeRule extends RuleHints {
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

export interface DocRefRule extends RuleHints {
	path: string;
}

export interface DocLinkRule extends RuleHints {
	path: string;
}

export interface DocConfig {
	ref?: DocRefRule[];
	link?: DocLinkRule[];
}

// --- GitHub config types ---

export type GithubPinnedTarget = "action" | "reusable" | "docker";

export interface GithubPinnedRule extends RuleHints {
	path: string;
	targets?: GithubPinnedTarget[];
}

export interface GithubRequiredRule extends RuleHints {
	file?: string;
	path?: string;
	steps?: string[];
}

export interface GithubForbiddenRule extends RuleHints {
	path: string;
	uses: string;
	message?: string;
	severity?: Severity;
}

export interface GithubPermissionsRule extends RuleHints {
	path: string;
	required?: boolean;
	forbid?: string[];
}

export interface GithubTriggersRule extends RuleHints {
	path: string;
	allowed?: string[];
	forbidden?: string[];
}

export interface GithubRunnerRule extends RuleHints {
	path: string;
	allowed: string[];
}

export interface GithubTimeoutRule extends RuleHints {
	path: string;
	max: number;
}

export interface GithubConcurrencyRule extends RuleHints {
	path: string;
}

export interface GithubConsistencyRule extends RuleHints {
	path: string;
	actions: string[];
}

export interface GithubSecretsRule extends RuleHints {
	path: string;
	allowed: string[];
}

export interface GithubCodeownersRule extends RuleHints {
	path: string;
	owners: string[];
	message?: string;
}

export interface GithubActionsDangerRule extends RuleHints {
	path: string;
	severity?: Severity;
}

export interface GithubActionsInjectionRule extends RuleHints {
	path: string;
	severity?: Severity;
	allow_contexts?: string[];
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

export interface DepsExistenceRule extends RuleHints {
	path: string;
	severity?: Severity;
	exclude?: string[];
}

export interface DepsFreshnessRule extends RuleHints {
	path: string;
	max_age_hours?: number;
	severity?: Severity;
}

export interface DepsPopularityRule extends RuleHints {
	path: string;
	min_downloads?: number;
	severity?: Severity;
}

export interface DepsCrossEcosystemRule extends RuleHints {
	path: string;
	severity?: Severity;
}

export interface DepsTyposquatRule extends RuleHints {
	path: string;
	max_distance?: number;
	targets?: string[];
	severity?: Severity;
}

export interface DepsAllowedRule extends RuleHints {
	path: string;
	names: string[];
	severity?: Severity;
}

export interface DepsDeniedRule extends RuleHints {
	path: string;
	names: string[];
	message?: string;
	severity?: Severity;
}

export interface DepsInstallScriptsRule extends RuleHints {
	path: string;
	exclude?: string[];
	hooks?: string[];
	message?: string;
	severity?: Severity;
}

export interface DepsGitDependencyRule extends RuleHints {
	path: string;
	exclude?: string[];
	message?: string;
	severity?: Severity;
}

export interface DepsFloatingVersionRule extends RuleHints {
	path: string;
	exclude?: string[];
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
	install_scripts?: DepsInstallScriptsRule[];
	git_dependency?: DepsGitDependencyRule[];
	floating_version?: DepsFloatingVersionRule[];
}

// --- Git config types ---

export type GitCommitMessagePreset = "conventional";

export interface GitCommitMessageRule extends RuleHints {
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

export interface GitCommitTrailersRule extends RuleHints {
	deny?: GitTrailerDenyEntry[];
	require?: GitTrailerRequireEntry[];
	allow?: GitTrailerAllowEntry[];
	severity?: Severity;
}

export interface GitDiffSizeRule extends RuleHints {
	max_files?: number;
	max_insertions?: number;
	max_deletions?: number;
	max_total_lines?: number;
	exclude?: string[];
	severity?: Severity;
}

export type GitDiffIgnoredScope = "diff" | "all";

export interface GitDiffIgnoredRule extends RuleHints {
	scope?: GitDiffIgnoredScope;
	allow?: string[];
	message?: string;
	severity?: Severity;
}

export type GitCommitReferencesScope = "all" | "any";

export interface GitCommitReferencesRule extends RuleHints {
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

export interface GitBranchNameRule extends RuleHints {
	pattern: string;
	allow?: string[];
	message?: string;
	severity?: Severity;
}

export interface GitTagNameRule extends RuleHints {
	pattern: string;
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
