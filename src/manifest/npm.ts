import type { InstallScript, ManifestEntry, ParseResult } from "./index.js";

const DEP_FIELDS = [
	"dependencies",
	"devDependencies",
	"peerDependencies",
	"optionalDependencies",
];

const LIFECYCLE_HOOKS = ["preinstall", "install", "postinstall", "prepare"];

export function parseNpmPackage(content: string): ParseResult {
	const pkg = JSON.parse(content);
	if (!pkg || typeof pkg !== "object") return { entries: [] };

	const lines = content.split("\n");
	const entries = new Map<string, ManifestEntry>();

	for (const field of DEP_FIELDS) {
		const deps = (pkg as Record<string, unknown>)[field];
		if (!deps || typeof deps !== "object") continue;
		for (const [name, version] of Object.entries(
			deps as Record<string, unknown>,
		)) {
			if (entries.has(name)) continue;
			entries.set(name, {
				name,
				ecosystem: "npm",
				line: findLine(lines, name),
				version: typeof version === "string" ? version : undefined,
			});
		}
	}

	const installScripts: InstallScript[] = [];
	const scripts = (pkg as Record<string, unknown>).scripts;
	if (scripts && typeof scripts === "object") {
		for (const hook of LIFECYCLE_HOOKS) {
			if (typeof (scripts as Record<string, unknown>)[hook] === "string") {
				installScripts.push({ hook, line: findScriptLine(lines, hook) });
			}
		}
	}

	return {
		entries: [...entries.values()],
		installScripts: installScripts.length > 0 ? installScripts : undefined,
	};
}

function findLine(lines: string[], name: string): number | undefined {
	const needle = `"${name}"`;
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].includes(needle)) return i + 1;
	}
	return undefined;
}

function findScriptLine(lines: string[], hook: string): number | undefined {
	const needle = `"${hook}"`;
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].includes(needle)) return i + 1;
	}
	return undefined;
}
