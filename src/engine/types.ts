import type { AgentConfig } from "../rules/agent/types.js";
import type { ContentConfig } from "../rules/content/types.js";
import type { DepsConfig } from "../rules/deps/types.js";
import type { DocConfig } from "../rules/doc/types.js";
import type { DockerConfig } from "../rules/docker/types.js";
import type { GitConfig } from "../rules/git/types.js";
import type { GithubConfig } from "../rules/github/types.js";
import type { LicenseConfig } from "../rules/license/types.js";
import type { PathConfig } from "../rules/path/types.js";
import type { RuntimeConfig } from "../rules/runtime/types.js";

export type Severity = "error" | "warn";

export interface RuleResult {
	rule: string;
	path: string;
	message: string;
	severity: Severity;
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
	runtime?: RuntimeConfig;
	license?: LicenseConfig;
	docker?: DockerConfig;
}

// --- Diff scope types ---

export type DiffGranularity = "file" | "line";

export interface DiffScope {
	files: Set<string>;
	addedLines: Map<string, Set<number>>;
	granularity: DiffGranularity;
}
