import { execFileSync } from "node:child_process";

export function runGit(cwd: string, args: string[]): string {
	return execFileSync("git", args, {
		cwd,
		encoding: "utf-8",
		stdio: ["ignore", "pipe", "pipe"],
		maxBuffer: 64 * 1024 * 1024,
	});
}

export function tryRunGit(cwd: string, args: string[]): string | null {
	try {
		return runGit(cwd, args);
	} catch {
		return null;
	}
}
