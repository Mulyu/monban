import { parse as parseYaml } from "yaml";
import type { ManifestEntry } from "./index.js";

export function parseWorkflow(content: string): ManifestEntry[] {
	const doc = parseYaml(content);
	if (!doc || typeof doc !== "object") return [];
	const jobs = (doc as Record<string, unknown>).jobs;
	if (!jobs || typeof jobs !== "object") return [];

	const entries = new Map<string, ManifestEntry>();
	for (const job of Object.values(jobs as Record<string, unknown>)) {
		if (!job || typeof job !== "object") continue;
		const rec = job as Record<string, unknown>;
		const jobUses = rec.uses;
		if (typeof jobUses === "string") addUses(entries, jobUses);
		const steps = rec.steps;
		if (Array.isArray(steps)) {
			for (const step of steps) {
				if (step && typeof step === "object") {
					const u = (step as Record<string, unknown>).uses;
					if (typeof u === "string") addUses(entries, u);
				}
			}
		}
	}
	return [...entries.values()];
}

function addUses(target: Map<string, ManifestEntry>, uses: string) {
	if (uses.startsWith("./")) return;
	if (uses.startsWith("docker://")) return;
	const atIndex = uses.lastIndexOf("@");
	const name = atIndex === -1 ? uses : uses.slice(0, atIndex);
	const segments = name.split("/");
	const canonical =
		segments.length >= 2 ? `${segments[0]}/${segments[1]}` : name;
	if (!target.has(canonical)) {
		target.set(canonical, { name: canonical, ecosystem: "github-actions" });
	}
}
