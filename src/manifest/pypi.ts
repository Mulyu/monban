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
		entries.push({ name: token, ecosystem: "pypi", line: i + 1 });
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
			if (name) entries.set(name, { name, ecosystem: "pypi" });
		}
	}

	const poetry = (doc.tool as Record<string, unknown> | undefined)?.poetry as
		| Record<string, unknown>
		| undefined;
	const poetryDeps = poetry?.dependencies;
	if (poetryDeps && typeof poetryDeps === "object") {
		for (const name of Object.keys(poetryDeps as Record<string, unknown>)) {
			if (name === "python") continue;
			entries.set(name, { name, ecosystem: "pypi" });
		}
	}

	return [...entries.values()];
}
