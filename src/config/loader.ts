import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parse } from "yaml";
import { ConfigError } from "../errors.js";
import type { MonbanConfig } from "../types.js";
import { resolveExtends } from "./extends/index.js";
import { validateConfig, validateExtends } from "./schema/index.js";

const CONFIG_FILENAMES = ["monban.yml", "monban.yaml"];

export async function loadConfig(cwd: string): Promise<MonbanConfig> {
	for (const filename of CONFIG_FILENAMES) {
		const filepath = resolve(cwd, filename);
		let content: string;
		try {
			content = await readFile(filepath, "utf-8");
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code === "ENOENT") {
				continue;
			}
			throw new ConfigError(
				`Failed to read ${filename}: ${(err as Error).message}`,
				err,
			);
		}

		try {
			const raw = parse(content);
			validateExtends(raw);
			const merged = await resolveExtends(raw, dirname(filepath));
			return validateConfig(merged);
		} catch (err) {
			if (err instanceof ConfigError) throw err;
			throw new ConfigError(
				`Invalid ${filename}: ${(err as Error).message}`,
				err,
			);
		}
	}

	throw new ConfigError(
		"monban.yml not found. Create one at the repository root.",
	);
}
