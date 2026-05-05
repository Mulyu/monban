import type { Severity } from "../../engine/types.js";

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
