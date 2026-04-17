import type { ExtendsSource } from "../../types.js";
import { loadGitHubExtends } from "./github.js";
import { loadLocalExtends } from "./local.js";
import { mergeRawConfigs } from "./merge.js";

export { mergeRawConfigs };

export async function resolveExtends(
	rawConfig: unknown,
	baseDir: string,
): Promise<unknown> {
	if (typeof rawConfig !== "object" || rawConfig === null) {
		return rawConfig;
	}

	const extendsField = (rawConfig as Record<string, unknown>).extends;
	if (!Array.isArray(extendsField) || extendsField.length === 0) {
		return rawConfig;
	}

	const sources = extendsField as ExtendsSource[];
	const resolved: unknown[] = [];

	for (const source of sources) {
		if (source.type === "local") {
			resolved.push(await loadLocalExtends(baseDir, source.path));
		} else if (source.type === "github") {
			resolved.push(
				await loadGitHubExtends(source.repo, source.ref, source.path),
			);
		}
	}

	return mergeRawConfigs(...resolved, rawConfig);
}
