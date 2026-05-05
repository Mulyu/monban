import type { Check } from "../engine/types.js";
import { agentCheck } from "./agent/index.js";
import { contentCheck } from "./content/index.js";
import { depsCheck } from "./deps/index.js";
import { docCheck } from "./doc/index.js";
import { dockerCheck } from "./docker/index.js";
import { gitCheck } from "./git/index.js";
import { githubCheck } from "./github/index.js";
import { licenseCheck } from "./license/index.js";
import { pathCheck } from "./path/index.js";
import { runtimeCheck } from "./runtime/index.js";

export const CHECKS: readonly Check[] = [
	pathCheck,
	contentCheck,
	docCheck,
	githubCheck,
	depsCheck,
	gitCheck,
	agentCheck,
	runtimeCheck,
	licenseCheck,
	dockerCheck,
];
