import type { ManifestEntry } from "./index.js";

const DEP_FIELDS = [
	"dependencies",
	"devDependencies",
	"peerDependencies",
	"optionalDependencies",
];

export function parseNpmPackage(content: string): ManifestEntry[] {
	const pkg = JSON.parse(content);
	if (!pkg || typeof pkg !== "object") return [];

	const lines = content.split("\n");
	const entries = new Map<string, ManifestEntry>();

	for (const field of DEP_FIELDS) {
		const deps = (pkg as Record<string, unknown>)[field];
		if (!deps || typeof deps !== "object") continue;
		for (const name of Object.keys(deps as Record<string, unknown>)) {
			if (entries.has(name)) continue;
			entries.set(name, {
				name,
				ecosystem: "npm",
				line: findLine(lines, name),
			});
		}
	}
	return [...entries.values()];
}

function findLine(lines: string[], name: string): number | undefined {
	const needle = `"${name}"`;
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].includes(needle)) return i + 1;
	}
	return undefined;
}
