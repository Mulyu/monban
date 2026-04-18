import fg from "fast-glob";
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

export function formatLocation(file: string, line?: number): string {
	return line !== undefined ? `${file}:${line}` : file;
}
