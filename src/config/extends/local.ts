import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "yaml";

export async function loadLocalExtends(
	baseDir: string,
	path: string,
): Promise<unknown> {
	const abs = resolve(baseDir, path);
	try {
		const content = await readFile(abs, "utf-8");
		return parse(content);
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === "ENOENT") {
			throw new Error(`extends: local file not found: ${path}`);
		}
		throw err;
	}
}
