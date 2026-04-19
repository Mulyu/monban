import { opendir } from "node:fs/promises";
import { join } from "node:path";
import picomatch from "picomatch";

export interface GlobOptions {
	cwd: string;
	dot?: boolean;
	onlyFiles?: boolean;
	onlyDirectories?: boolean;
	markDirectories?: boolean;
	followSymbolicLinks?: boolean;
	ignore?: string[];
}

export async function glob(
	patterns: string | string[],
	options: GlobOptions,
): Promise<string[]> {
	const pats = (Array.isArray(patterns) ? patterns : [patterns]).map(
		normalizePattern,
	);
	const {
		cwd,
		dot = false,
		onlyFiles: onlyFilesOpt = true,
		onlyDirectories = false,
		markDirectories = false,
		ignore = [],
	} = options;

	// fast-glob compat: onlyDirectories implies onlyFiles=false.
	const onlyFiles = onlyDirectories ? false : onlyFilesOpt;

	const isMatch = picomatch(pats, { dot });
	const isIgnored =
		ignore.length > 0 ? picomatch(ignore, { dot: true }) : () => false;

	const dotDirAllowlist = collectLiteralDotPrefixes(pats);

	const results: string[] = [];

	async function walk(dir: string, rel: string): Promise<void> {
		let handle: Awaited<ReturnType<typeof opendir>>;
		try {
			handle = await opendir(dir);
		} catch {
			return;
		}
		for await (const entry of handle) {
			const childRel = rel ? `${rel}/${entry.name}` : entry.name;

			if (isIgnored(childRel)) continue;

			if (!dot && entry.name.startsWith(".")) {
				if (!dotDirAllowlist.has(childRel)) continue;
			}

			const isDir = entry.isDirectory();
			const isSymlink = entry.isSymbolicLink();
			// Treat symlinks as files (fast-glob with followSymbolicLinks:false
			// still returns them in matches; consumers use lstat to classify).
			const isFile = entry.isFile() || isSymlink;

			if (isDir) {
				if (!onlyFiles && isMatch(childRel)) {
					results.push(markDirectories ? `${childRel}/` : childRel);
				}
				await walk(join(dir, entry.name), childRel);
			} else if (isFile) {
				if (onlyDirectories) continue;
				if (isMatch(childRel)) {
					results.push(childRel);
				}
			}
		}
	}

	await walk(cwd, "");
	return results;
}

export default glob;

function normalizePattern(p: string): string {
	return p.startsWith("./") ? p.slice(2) : p;
}

function collectLiteralDotPrefixes(patterns: string[]): Set<string> {
	const prefixes = new Set<string>();
	const hasMagic = /[*?[\]{}!+@()]/;
	for (const p of patterns) {
		const segments = p.split("/");
		let acc = "";
		for (const seg of segments) {
			if (hasMagic.test(seg)) break;
			acc = acc ? `${acc}/${seg}` : seg;
			if (seg.startsWith(".")) {
				prefixes.add(acc);
			}
		}
	}
	return prefixes;
}
