import { parseYaml } from "../../../shared/parse-yaml.js";

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

export function extractFrontmatter(
	content: string,
): Record<string, unknown> | null {
	const m = content.match(FRONTMATTER_RE);
	if (!m) return null;
	const parsed = parseYaml(m[1]);
	if (!parsed.ok) return null;
	const doc = parsed.value;
	if (doc && typeof doc === "object" && !Array.isArray(doc)) {
		return doc as Record<string, unknown>;
	}
	return null;
}
