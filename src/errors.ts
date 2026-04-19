import type { RuleResult } from "./types.js";

export class RuleExecutionError extends Error {
	readonly cause?: unknown;
	constructor(message: string, cause?: unknown) {
		super(message);
		this.cause = cause;
	}
}

export class ConfigError extends Error {
	readonly cause?: unknown;
	constructor(message: string, cause?: unknown) {
		super(message);
		this.name = "ConfigError";
		this.cause = cause;
	}
}

export function networkWarning(
	rule: string,
	path: string,
	message: string,
): RuleResult {
	return {
		rule,
		path,
		message,
		severity: "warn",
	};
}
