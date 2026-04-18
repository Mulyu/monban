import fg from "fast-glob";
import picomatch from "picomatch";
import { loadManifest, type Manifest } from "../../manifest/index.js";

export async function loadManifests(
	path: string,
	cwd: string,
	globalExclude: string[],
): Promise<Manifest[]> {
	const files = await fg(path, {
		cwd,
		dot: true,
		onlyFiles: true,
		ignore: globalExclude,
	});

	const manifests: Manifest[] = [];
	for (const file of files) {
		const m = await loadManifest(file, cwd);
		if (m) manifests.push(m);
	}
	return manifests;
}

export function matchAny(name: string, patterns: string[]): boolean {
	if (patterns.length === 0) return false;
	const isMatch = picomatch(patterns, { nocase: false });
	return isMatch(name);
}

export function levenshtein(a: string, b: string): number {
	if (a === b) return 0;
	const m = a.length;
	const n = b.length;
	if (m === 0) return n;
	if (n === 0) return m;

	const prev = new Array<number>(n + 1);
	for (let j = 0; j <= n; j++) prev[j] = j;
	for (let i = 1; i <= m; i++) {
		let prevDiag = prev[0];
		prev[0] = i;
		for (let j = 1; j <= n; j++) {
			const temp = prev[j];
			if (a[i - 1] === b[j - 1]) {
				prev[j] = prevDiag;
			} else {
				prev[j] = 1 + Math.min(prev[j - 1], prev[j], prevDiag);
			}
			prevDiag = temp;
		}
	}
	return prev[n];
}

export function formatLocation(file: string, line?: number): string {
	return line !== undefined ? `${file}:${line}` : file;
}
