import { parse as parseToml } from "smol-toml";
import type { ManifestEntry } from "./index.js";

const DEP_TABLES = ["dependencies", "dev-dependencies", "build-dependencies"];

export function parseCargoToml(content: string): ManifestEntry[] {
	const doc = parseToml(content) as Record<string, unknown>;
	const entries = new Map<string, ManifestEntry>();

	for (const table of DEP_TABLES) {
		const section = doc[table];
		if (section && typeof section === "object") {
			for (const [name, spec] of Object.entries(
				section as Record<string, unknown>,
			)) {
				const version =
					typeof spec === "string" ? spec : stringifyCargoSpec(spec);
				entries.set(name, { name, ecosystem: "cargo", version });
			}
		}
	}

	return [...entries.values()];
}

function stringifyCargoSpec(spec: unknown): string | undefined {
	if (!spec || typeof spec !== "object") return undefined;
	const obj = spec as Record<string, unknown>;
	if (typeof obj.git === "string") return `git+${obj.git}`;
	if (typeof obj.path === "string") return `file:${obj.path}`;
	if (typeof obj.version === "string") return obj.version;
	return undefined;
}
