export function extractUses(doc: unknown): string[] {
	const uses: string[] = [];
	if (!doc || typeof doc !== "object") return uses;

	const root = doc as Record<string, unknown>;
	const jobs = root.jobs;
	if (!jobs || typeof jobs !== "object") return uses;

	for (const job of Object.values(jobs as Record<string, unknown>)) {
		if (!job || typeof job !== "object") continue;
		const steps = (job as Record<string, unknown>).steps;
		if (!Array.isArray(steps)) continue;

		for (const step of steps) {
			if (!step || typeof step !== "object") continue;
			const u = (step as Record<string, unknown>).uses;
			if (typeof u === "string") {
				uses.push(u);
			}
		}
	}

	return uses;
}
