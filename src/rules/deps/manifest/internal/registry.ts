import type { DepsEcosystem } from "../../types.js";
import { parseCargoToml } from "../cargo.js";
import { parseWorkflow } from "../github-actions.js";
import { parseGoMod } from "../go.js";
import type { ParseResult } from "../index.js";
import { parseNpmPackage } from "../npm.js";
import { parsePyproject, parseRequirementsTxt } from "../pypi.js";
import { parseGemfile } from "../rubygems.js";

type ManifestParser = (file: string, content: string) => ParseResult;

const PARSERS: Record<DepsEcosystem, ManifestParser> = {
	npm: (_file, content) => parseNpmPackage(content),
	go: (_file, content) => ({ entries: parseGoMod(content) }),
	rubygems: (_file, content) => ({ entries: parseGemfile(content) }),
	cargo: (_file, content) => ({ entries: parseCargoToml(content) }),
	"github-actions": (_file, content) => ({ entries: parseWorkflow(content) }),
	pypi: (file, content) => ({
		entries: file.endsWith("pyproject.toml")
			? parsePyproject(content)
			: parseRequirementsTxt(content),
	}),
};

export function parseManifestContent(
	file: string,
	content: string,
	ecosystem: DepsEcosystem,
): ParseResult {
	const parser = PARSERS[ecosystem];
	return parser(file, content);
}
