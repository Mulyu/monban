import type {
	DepsEcosystem,
	DepsTyposquatRule,
	RuleResult,
} from "../../types.js";
import { levenshtein } from "./levenshtein.js";
import { formatLocation, loadManifests } from "./manifest-loader.js";

const DEFAULT_MAX_DISTANCE = 2;

const POPULAR_BY_ECOSYSTEM: Record<DepsEcosystem, string[]> = {
	npm: [
		"react",
		"react-dom",
		"lodash",
		"express",
		"typescript",
		"webpack",
		"eslint",
		"prettier",
		"vite",
		"next",
		"axios",
		"vue",
		"commander",
		"chalk",
		"yargs",
	],
	pypi: [
		"requests",
		"numpy",
		"pandas",
		"flask",
		"django",
		"pytest",
		"sqlalchemy",
		"fastapi",
		"pydantic",
		"boto3",
	],
	rubygems: ["rails", "rack", "sinatra", "rspec", "nokogiri", "devise"],
	cargo: ["serde", "tokio", "clap", "anyhow", "thiserror", "reqwest"],
	go: ["github.com/spf13/cobra", "github.com/stretchr/testify"],
	"github-actions": [
		"actions/checkout",
		"actions/setup-node",
		"actions/setup-python",
		"actions/cache",
		"actions/upload-artifact",
		"actions/download-artifact",
	],
};

export async function checkDepsTyposquat(
	rules: DepsTyposquatRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const severity = rule.severity ?? "warn";
		const maxDistance = rule.max_distance ?? DEFAULT_MAX_DISTANCE;
		const manifests = await loadManifests(rule.path, cwd, globalExclude);

		for (const manifest of manifests) {
			const popular = new Set<string>([
				...POPULAR_BY_ECOSYSTEM[manifest.ecosystem],
				...(rule.targets ?? []),
			]);

			for (const entry of manifest.entries) {
				if (popular.has(entry.name)) continue;
				for (const target of popular) {
					const d = levenshtein(entry.name, target);
					if (d === 0) continue;
					if (d <= maxDistance) {
						results.push({
							rule: "typosquat",
							path: formatLocation(manifest.file, entry.line),
							message: `${entry.name}: 人気パッケージ ${target} と編集距離 ${d}。`,
							severity,
						});
						break;
					}
				}
			}
		}
	}

	return results;
}
