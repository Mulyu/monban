import type { ManifestEntry } from "./index.js";

export function parseGoMod(content: string): ManifestEntry[] {
	const entries: ManifestEntry[] = [];
	const lines = content.split("\n");
	let inBlock = false;

	for (let i = 0; i < lines.length; i++) {
		const raw = lines[i];
		const line = raw.split("//")[0].trim();

		if (!inBlock) {
			const single = line.match(/^require\s+(\S+)\s+(v\S+)/);
			if (single) {
				entries.push({
					name: single[1],
					ecosystem: "go",
					line: i + 1,
					version: single[2],
				});
				continue;
			}
			if (/^require\s*\(/.test(line)) {
				inBlock = true;
			}
		} else {
			if (line === ")") {
				inBlock = false;
				continue;
			}
			const m = line.match(/^(\S+)\s+(v\S+)/);
			if (m) {
				entries.push({
					name: m[1],
					ecosystem: "go",
					line: i + 1,
					version: m[2],
				});
			}
		}
	}
	return entries;
}
