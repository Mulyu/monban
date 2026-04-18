import { resolveDiffBase } from "../../diff.js";
import { tryRunGit } from "./git-exec.js";

export interface GitRange {
	base: string;
	head: string;
	commitRange: string;
	diffRange: string;
}

export interface GitRangeOpts {
	diff?: string | boolean;
}

export function resolveGitRange(
	cwd: string,
	opts: GitRangeOpts,
): GitRange | null {
	const head = resolveHead(cwd);
	if (!head) return null;

	const base = resolveBaseFromOpts(cwd, opts);
	if (!base) return null;

	return {
		base,
		head,
		commitRange: `${base}..${head}`,
		diffRange: `${base}...${head}`,
	};
}

function resolveHead(cwd: string): string | null {
	const out = tryRunGit(cwd, ["rev-parse", "HEAD"]);
	if (!out) return null;
	return out.trim();
}

function resolveBaseFromOpts(cwd: string, opts: GitRangeOpts): string | null {
	const explicit = typeof opts.diff === "string" ? opts.diff : undefined;
	const auto = opts.diff !== undefined;

	if (explicit) {
		const normalized = normalizeBase(explicit);
		if (verifyRef(cwd, normalized)) return normalized;
		return null;
	}

	if (auto) {
		const resolved = resolveDiffBase(cwd);
		if (resolved) return resolved;
	}

	const parent = tryRunGit(cwd, ["rev-parse", "HEAD~1"]);
	if (parent) return parent.trim();
	return null;
}

function normalizeBase(ref: string): string {
	const idx = ref.indexOf("...");
	if (idx !== -1) return ref.slice(0, idx);
	const idx2 = ref.indexOf("..");
	if (idx2 !== -1) return ref.slice(0, idx2);
	return ref;
}

function verifyRef(cwd: string, ref: string): boolean {
	return tryRunGit(cwd, ["rev-parse", "--verify", ref]) !== null;
}
