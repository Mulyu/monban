import type { RuntimeConsistencySource } from "../../types.js";

export const RUNTIME_PRESETS: Record<string, RuntimeConsistencySource[]> = {
	node: [
		{ path: ".nvmrc" },
		{ path: ".node-version" },
		{ path: "**/Dockerfile", pattern: "^FROM\\s+node:([\\d.]+)" },
		{
			path: ".github/workflows/*.yml",
			yaml_key: "jobs.*.steps.*.with.node-version",
		},
	],

	python: [
		{ path: ".python-version" },
		{ path: "**/Dockerfile", pattern: "^FROM\\s+python:([\\d.]+)" },
		{
			path: ".github/workflows/*.yml",
			yaml_key: "jobs.*.steps.*.with.python-version",
		},
	],

	ruby: [
		{ path: ".ruby-version" },
		{ path: "**/Dockerfile", pattern: "^FROM\\s+ruby:([\\d.]+)" },
		{
			path: ".github/workflows/*.yml",
			yaml_key: "jobs.*.steps.*.with.ruby-version",
		},
	],

	go: [
		{ path: "go.mod", pattern: "^go\\s+([\\d.]+)" },
		{ path: "**/Dockerfile", pattern: "^FROM\\s+golang:([\\d.]+)" },
		{
			path: ".github/workflows/*.yml",
			yaml_key: "jobs.*.steps.*.with.go-version",
		},
	],

	rust: [
		{ path: "rust-toolchain.toml", pattern: '^channel\\s*=\\s*"([\\d.]+)"' },
		{ path: "rust-toolchain" },
		{
			path: ".github/workflows/*.yml",
			yaml_key: "jobs.*.steps.*.with.toolchain",
		},
	],
};

export const RUNTIME_PRESET_NAMES = Object.keys(RUNTIME_PRESETS);
