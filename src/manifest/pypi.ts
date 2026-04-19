import { parse as parseToml } from "smol-toml";
import type { ManifestEntry } from "./index.js";

const REQ_SPLIT = /[<>=!~\s;[]/;

export function parseRequirementsTxt(content: string): ManifestEntry[] {
	const entries: ManifestEntry[] = [];
	const lines = content.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const raw = lines[i];
		const stripped = raw.split("#")[0].trim();
		if (stripped.length === 0) continue;
		if (stripped.startsWith("-")) continue; // -r other.txt, -e ./local
		const token = stripped.split(REQ_SPLIT)[0].trim();
		if (token.length === 0) continue;
		const version = stripped.slice(token.length).trim() || undefined;
		entries.push({ name: token, ecosystem: "pypi", line: i + 1, version });
	}
	return entries;
}

export function parsePyproject(content: string): ManifestEntry[] {
	const doc = parseToml(content) as Record<string, unknown>;
	const entries = new Map<string, ManifestEntry>();

	const project = doc.project as Record<string, unknown> | undefined;
	const pep621 = project?.dependencies;
	if (Array.isArray(pep621)) {
		for (const item of pep621) {
			if (typeof item !== "string") continue;
			const name = item.split(REQ_SPLIT)[0].trim();
			if (!name) continue;
			const version = item.slice(name.length).trim() || undefined;
			entries.set(name, { name, ecosystem: "pypi", version });
		}
	}

	const poetry = (doc.tool as Record<string, unknown> | undefined)?.poetry as
		| Record<string, unknown>
		| undefined;
	const poetryDeps = poetry?.dependencies;
	if (poetryDeps && typeof poetryDeps === "object") {
		for (const [name, spec] of Object.entries(
			poetryDeps as Record<string, unknown>,
		)) {
			if (name === "python") continue;
			const version =
				typeof spec === "string" ? spec : stringifyPoetrySpec(spec);
			entries.set(name, { name, ecosystem: "pypi", version });
		}
	}

	return [...entries.values()];
}

function stringifyPoetrySpec(spec: unknown): string | undefined {
	if (!spec || typeof spec !== "object") return undefined;
	const obj = spec as Record<string, unknown>;
	if (typeof obj.git === "string") return `git+${obj.git}`;
	if (typeof obj.path === "string") return `file:${obj.path}`;
	if (typeof obj.url === "string") return String(obj.url);
	if (typeof obj.version === "string") return obj.version;
	return undefined;
}
