import { tryRunGit } from "./git-exec.js";

export interface GitCommit {
	sha: string;
	shortSha: string;
	subject: string;
	body: string;
	trailers: GitTrailer[];
	isMerge: boolean;
	isRevert: boolean;
}

export interface GitTrailer {
	key: string;
	value: string;
}

const RECORD_SEP = "\x1e";
const FIELD_SEP = "\x1f";

export function getCommits(cwd: string, range: string): GitCommit[] {
	const out = tryRunGit(cwd, [
		"log",
		`--format=${RECORD_SEP}%H${FIELD_SEP}%P${FIELD_SEP}%B`,
		range,
	]);
	if (out === null) return [];

	const commits: GitCommit[] = [];
	const records = out.split(RECORD_SEP).filter((r) => r.length > 0);
	for (const record of records) {
		const [sha, parents, rest] = record.split(FIELD_SEP);
		if (!sha || rest === undefined) continue;
		const trimmed = rest.replace(/\n+$/, "");
		const newlineIdx = trimmed.indexOf("\n");
		const subject = newlineIdx === -1 ? trimmed : trimmed.slice(0, newlineIdx);
		const body =
			newlineIdx === -1
				? ""
				: trimmed.slice(newlineIdx + 1).replace(/^\n+/, "");
		const parentShas = (parents ?? "").trim().split(/\s+/).filter(Boolean);
		commits.push({
			sha,
			shortSha: sha.slice(0, 7),
			subject,
			body,
			trailers: parseTrailers(body),
			isMerge: parentShas.length > 1,
			isRevert: /^Revert\b/i.test(subject),
		});
	}
	return commits;
}

export function parseTrailers(body: string): GitTrailer[] {
	if (body.length === 0) return [];
	const lines = body.split("\n");
	let start = lines.length;
	for (let i = lines.length - 1; i >= 0; i--) {
		if (lines[i].trim() === "") {
			if (start < lines.length) break;
			continue;
		}
		if (isTrailerLine(lines[i])) {
			start = i;
		} else {
			break;
		}
	}
	if (start >= lines.length) return [];

	const trailers: GitTrailer[] = [];
	for (let i = start; i < lines.length; i++) {
		const line = lines[i];
		if (line.trim() === "") continue;
		const match = line.match(/^([A-Za-z][A-Za-z0-9-]*):[ \t](.*)$/);
		if (match) {
			trailers.push({ key: match[1], value: match[2].trim() });
		}
	}
	return trailers;
}

function isTrailerLine(line: string): boolean {
	return /^[A-Za-z][A-Za-z0-9-]*:[ \t]/.test(line);
}
