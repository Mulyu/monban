import type { ManifestEntry } from "./index.js";

const GEM_LINE = /^\s*gem\s+["']([^"']+)["']/;

export function parseGemfile(content: string): ManifestEntry[] {
	const entries: ManifestEntry[] = [];
	const lines = content.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const stripped = lines[i].split("#")[0];
		const m = stripped.match(GEM_LINE);
		if (m) {
			entries.push({ name: m[1], ecosystem: "rubygems", line: i + 1 });
		}
	}
	return entries;
}
