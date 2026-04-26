import fg from "fast-glob";

export interface AgentFileQuery {
	path: string;
	exclude?: string[];
}

export function listAgentFiles(
	rule: AgentFileQuery,
	cwd: string,
	globalExclude: string[],
): Promise<string[]> {
	return fg(rule.path, {
		cwd,
		dot: true,
		onlyFiles: true,
		ignore: [...globalExclude, ...(rule.exclude ?? [])],
	});
}
