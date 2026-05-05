import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/cli/bin.ts"],
	format: "esm",
	dts: true,
	clean: true,
	banner: { js: "#!/usr/bin/env node" },
});
