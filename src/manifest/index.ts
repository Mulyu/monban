import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { DepsEcosystem } from "../types.js";
import { parseCargoToml } from "./cargo.js";
import { parseWorkflow } from "./github-actions.js";
import { parseGoMod } from "./go.js";
import { parseNpmPackage } from "./npm.js";
import { parsePyproject, parseRequirementsTxt } from "./pypi.js";
import { parseGemfile } from "./rubygems.js";

export interface ManifestEntry {
	name: string;
	ecosystem: DepsEcosystem;
	line?: number;
	/** Raw version or source specifier as written in the manifest. */
	version?: string;
}

export interface InstallScript {
	hook: string;
	line?: number;
}

export interface Manifest {
	file: string;
	ecosystem: DepsEcosystem;
	entries: ManifestEntry[];
	/** npm lifecycle hooks (preinstall/install/postinstall/prepare) when present. */
	installScripts?: InstallScript[];
}

export function detectEcosystem(file: string): DepsEcosystem | null {
	const name = basename(file);
	if (name === "package.json") return "npm";
	if (name === "requirements.txt" || name.endsWith(".requirements.txt"))
		return "pypi";
	if (name === "pyproject.toml") return "pypi";
	if (name === "go.mod") return "go";
	if (name === "Gemfile") return "rubygems";
	if (name === "Cargo.toml") return "cargo";
	if (file.includes(".github/workflows/") && /\.ya?ml$/.test(name))
		return "github-actions";
	return null;
}

export interface ParseResult {
	entries: ManifestEntry[];
	installScripts?: InstallScript[];
}

export async function loadManifest(
	file: string,
	cwd: string,
): Promise<Manifest | null> {
	const ecosystem = detectEcosystem(file);
	if (!ecosystem) return null;

	const abs = join(cwd, file);
	const content = await readFile(abs, "utf-8");

	let result: ParseResult = { entries: [] };
	try {
		if (ecosystem === "npm") result = parseNpmPackage(content);
		else if (ecosystem === "go") result = { entries: parseGoMod(content) };
		else if (ecosystem === "rubygems")
			result = { entries: parseGemfile(content) };
		else if (ecosystem === "cargo")
			result = { entries: parseCargoToml(content) };
		else if (ecosystem === "github-actions")
			result = { entries: parseWorkflow(content) };
		else if (ecosystem === "pypi") {
			result = {
				entries: file.endsWith("pyproject.toml")
					? parsePyproject(content)
					: parseRequirementsTxt(content),
			};
		}
	} catch {
		// Unparseable manifest — treat as empty.
		return { file, ecosystem, entries: [] };
	}

	return {
		file,
		ecosystem,
		entries: result.entries,
		installScripts: result.installScripts,
	};
}
