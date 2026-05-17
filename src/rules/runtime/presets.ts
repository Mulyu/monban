import type { RuntimeConsistencySource } from "./types.js";

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

	java: [
		{ path: ".java-version" },
		{
			path: "**/Dockerfile",
			pattern: "^FROM\\s+(?:eclipse-temurin|openjdk|amazoncorretto):([\\d.]+)",
		},
		{
			path: ".github/workflows/*.yml",
			yaml_key: "jobs.*.steps.*.with.java-version",
		},
	],

	dotnet: [
		{ path: "global.json", json_key: "sdk.version" },
		{
			path: "**/Dockerfile",
			pattern: "^FROM\\s+mcr\\.microsoft\\.com/dotnet/[^:\\s]+:([\\d.]+)",
		},
		{
			path: ".github/workflows/*.yml",
			yaml_key: "jobs.*.steps.*.with.dotnet-version",
		},
	],

	php: [
		{ path: ".php-version" },
		{ path: "**/Dockerfile", pattern: "^FROM\\s+php:([\\d.]+)" },
		{
			path: ".github/workflows/*.yml",
			yaml_key: "jobs.*.steps.*.with.php-version",
		},
	],

	kotlin: [
		{ path: ".kotlin-version" },
		{
			path: "**/Dockerfile",
			pattern: "^FROM\\s+(?:gradle|kotlin):([\\d.]+)",
		},
	],
};

export const RUNTIME_PRESET_NAMES = Object.keys(RUNTIME_PRESETS);
