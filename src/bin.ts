import { createCli } from "./cli.js";
import { ConfigError } from "./errors.js";

const program = createCli();
program.parseAsync().catch((err: unknown) => {
	if (err instanceof ConfigError) {
		console.error(`Error: ${err.message}`);
	} else if (err instanceof Error) {
		console.error(`Error: ${err.message}`);
		if (process.env.MONBAN_DEBUG && err.stack) {
			console.error(err.stack);
		}
	} else {
		console.error("Error: unknown failure");
	}
	process.exit(2);
});
