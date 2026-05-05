import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const FIXED_DATE = "2026-01-01T00:00:00";

function env(): NodeJS.ProcessEnv {
	return {
		...process.env,
		GIT_COMMITTER_DATE: FIXED_DATE,
		GIT_AUTHOR_DATE: FIXED_DATE,
		GIT_COMMITTER_NAME: "Test",
		GIT_AUTHOR_NAME: "Test",
		GIT_COMMITTER_EMAIL: "test@example.com",
		GIT_AUTHOR_EMAIL: "test@example.com",
	};
}

export async function createGitRepo(): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), "monban-git-"));
	git(dir, ["init", "-q", "-b", "main"]);
	git(dir, ["config", "user.email", "test@example.com"]);
	git(dir, ["config", "user.name", "Test"]);
	git(dir, ["config", "commit.gpgsign", "false"]);
	return dir;
}

export function git(cwd: string, args: string[]): string {
	return execFileSync("git", args, {
		cwd,
		encoding: "utf-8",
		stdio: ["ignore", "pipe", "pipe"],
		env: env(),
	});
}

export async function writeAndAdd(
	cwd: string,
	path: string,
	content: string,
): Promise<void> {
	const abs = join(cwd, path);
	await mkdir(dirname(abs), { recursive: true });
	await writeFile(abs, content);
	git(cwd, ["add", "-f", path]);
}

export function commit(cwd: string, message: string): string {
	execFileSync("git", ["commit", "-q", "--allow-empty", "-F", "-"], {
		cwd,
		encoding: "utf-8",
		stdio: ["pipe", "pipe", "pipe"],
		input: message,
		env: env(),
	});
	return git(cwd, ["rev-parse", "HEAD"]).trim();
}
