import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { parse } from "yaml";

const execAsync = promisify(exec);

const COMMIT_HASH = /^[0-9a-f]{40}$/;

export async function loadGitHubExtends(
	repo: string,
	ref: string | undefined,
	path: string,
): Promise<unknown> {
	const effectiveRef = ref ?? "HEAD";
	const cacheDir = getCacheDir(repo, effectiveRef);
	const cachedFile = join(cacheDir, path);

	const isImmutable = COMMIT_HASH.test(effectiveRef);
	const shouldUseCache = isImmutable && existsSync(cachedFile);

	if (!shouldUseCache) {
		await fetchFromGitHub(repo, effectiveRef, path, cacheDir);
	}

	try {
		const content = await readFile(cachedFile, "utf-8");
		return parse(content);
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === "ENOENT") {
			throw new Error(
				`extends: file not found in ${repo}@${effectiveRef}: ${path}`,
			);
		}
		throw err;
	}
}

function getCacheDir(repo: string, ref: string): string {
	return join(homedir(), ".cache", "monban", "github", repo, ref);
}

async function fetchFromGitHub(
	repo: string,
	ref: string,
	path: string,
	cacheDir: string,
): Promise<void> {
	const url = `https://github.com/${repo}.git`;

	await mkdir(cacheDir, { recursive: true });

	if (!existsSync(join(cacheDir, ".git"))) {
		await runGit(cacheDir, [
			"clone",
			"--depth",
			"1",
			"--no-checkout",
			"--filter=blob:none",
			url,
			".",
		]);
	}

	await runGit(cacheDir, ["fetch", "--depth", "1", "origin", ref]);
	await runGit(cacheDir, ["checkout", "FETCH_HEAD", "--", path]);
}

async function runGit(cwd: string, args: string[]): Promise<void> {
	try {
		await execAsync(`git ${args.map(shellEscape).join(" ")}`, { cwd });
	} catch (err) {
		const e = err as { stderr?: string; message?: string };
		const msg = e.stderr?.trim() || e.message || "git command failed";
		throw new Error(`git ${args.join(" ")}: ${msg}`);
	}
}

function shellEscape(arg: string): string {
	if (/^[\w\-./=:@]+$/.test(arg)) return arg;
	return `'${arg.replace(/'/g, "'\\''")}'`;
}
