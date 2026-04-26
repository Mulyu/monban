import type { GithubConfig } from "../../../types.js";
import { validateGithubActionsConfig } from "./actions.js";
import { validateGithubCodeownersConfig } from "./codeowners.js";

export function validateGithubConfig(raw: unknown): GithubConfig {
	if (typeof raw !== "object" || raw === null) {
		throw new Error("github must be an object");
	}

	const obj = raw as Record<string, unknown>;
	const config: GithubConfig = {};

	if (obj.actions !== undefined) {
		config.actions = validateGithubActionsConfig(obj.actions);
	}
	if (obj.codeowners !== undefined) {
		config.codeowners = validateGithubCodeownersConfig(obj.codeowners);
	}

	return config;
}
