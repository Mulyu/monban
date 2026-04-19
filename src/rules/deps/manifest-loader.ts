import { loadManifest, type Manifest } from "../../manifest/index.js";
import fg from "../../ports/glob.js";

export async function loadManifests(
	path: string,
	cwd: string,
	globalExclude: string[],
	ruleExclude?: string[],
): Promise<Manifest[]> {
	const files = await fg(path, {
		cwd,
		dot: true,
		onlyFiles: true,
		ignore: [...globalExclude, ...(ruleExclude ?? [])],
	});

	const manifests: Manifest[] = [];
	for (const file of files) {
		const m = await loadManifest(file, cwd);
		if (m) manifests.push(m);
	}
	return manifests;
}

export function formatLocation(file: string, line?: number): string {
	return line !== undefined ? `${file}:${line}` : file;
}
