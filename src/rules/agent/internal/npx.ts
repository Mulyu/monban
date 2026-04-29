/** Matches a command that IS exactly `npx` or `npx.cmd`. */
export const NPX_COMMAND_RE = /^npx?(\.cmd)?$/;

/** Matches an unpinned npm spec ending in `@latest` or with no `@version`. */
export const NPX_LATEST_ARG = /(?:^|@)latest$/;

/** Matches an `npx <pkg>` invocation embedded in a shell command string. */
export const NPX_IN_COMMAND = /\bnpx?(?:\.cmd)?\s+([^\s;&|]+)/g;

/**
 * Returns true if the given npx package argument is unpinned
 * (no version, or ending in `@latest`).
 */
export function isUnpinnedNpxArg(pkgArg: string): boolean {
	return !pkgArg.includes("@") || NPX_LATEST_ARG.test(pkgArg);
}
