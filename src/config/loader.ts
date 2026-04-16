import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "yaml";
import type { MonbanConfig } from "../types.js";
import { validateConfig } from "./schema.js";

const CONFIG_FILENAMES = ["monban.yml", "monban.yaml"];

export async function loadConfig(cwd: string): Promise<MonbanConfig> {
	for (const filename of CONFIG_FILENAMES) {
		const filepath = resolve(cwd, filename);
		try {
			const content = await readFile(filepath, "utf-8");
			const raw = parse(content);
			return validateConfig(raw);
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code === "ENOENT") {
				continue;
			}
			throw err;
		}
	}

	throw new Error(
		"monban.yml not found. Run `monban init` to create one, or create it manually.",
	);
}
