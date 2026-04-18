import { parse as parseToml } from "smol-toml";
import type { ManifestEntry } from "./index.js";

const DEP_TABLES = ["dependencies", "dev-dependencies", "build-dependencies"];

export function parseCargoToml(content: string): ManifestEntry[] {
	const doc = parseToml(content) as Record<string, unknown>;
	const entries = new Map<string, ManifestEntry>();

	for (const table of DEP_TABLES) {
		const section = doc[table];
		if (section && typeof section === "object") {
			for (const name of Object.keys(section as Record<string, unknown>)) {
				entries.set(name, { name, ecosystem: "cargo" });
			}
		}
	}

	return [...entries.values()];
}
