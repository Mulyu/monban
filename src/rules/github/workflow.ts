import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import fg from "../../ports/glob.js";

export interface WorkflowFile {
	file: string;
	content: string;
	doc: unknown;
}

export async function loadWorkflows(
	path: string,
	cwd: string,
	globalExclude: string[],
): Promise<WorkflowFile[]> {
	const files = await fg(path, {
		cwd,
		dot: true,
		onlyFiles: true,
		ignore: globalExclude,
	});

	const workflows: WorkflowFile[] = [];
	for (const file of files) {
		const abs = join(cwd, file);
		const content = await readFile(abs, "utf-8");
		try {
			const doc = parse(content);
			workflows.push({ file, content, doc });
		} catch {
			// skip unparsable YAML
		}
	}
	return workflows;
}

export function getJobs(doc: unknown): Record<string, Record<string, unknown>> {
	if (!doc || typeof doc !== "object") return {};
	const root = doc as Record<string, unknown>;
	const jobs = root.jobs;
	if (!jobs || typeof jobs !== "object") return {};
	const result: Record<string, Record<string, unknown>> = {};
	for (const [name, job] of Object.entries(jobs as Record<string, unknown>)) {
		if (job && typeof job === "object") {
			result[name] = job as Record<string, unknown>;
		}
	}
	return result;
}

export interface UsesEntry {
	uses: string;
	kind: "action" | "reusable" | "docker";
}

export function extractAllUses(doc: unknown): UsesEntry[] {
	const entries: UsesEntry[] = [];
	const jobs = getJobs(doc);

	for (const job of Object.values(jobs)) {
		const jobUses = job.uses;
		if (typeof jobUses === "string") {
			entries.push({ uses: jobUses, kind: "reusable" });
			continue;
		}
		const steps = job.steps;
		if (!Array.isArray(steps)) continue;
		for (const step of steps) {
			if (!step || typeof step !== "object") continue;
			const u = (step as Record<string, unknown>).uses;
			if (typeof u !== "string") continue;
			if (u.startsWith("docker://")) {
				entries.push({ uses: u, kind: "docker" });
			} else {
				entries.push({ uses: u, kind: "action" });
			}
		}
	}
	return entries;
}

export function extractStepUses(doc: unknown): string[] {
	return extractAllUses(doc)
		.filter((e) => e.kind === "action" || e.kind === "docker")
		.map((e) => e.uses);
}
