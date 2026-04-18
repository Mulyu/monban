import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkPathDepth } from "../src/rules/path/depth.js";

const cwd = resolve(import.meta.dirname, "fixtures/project");

describe("path/depth", () => {
	it("detects files exceeding max depth", async () => {
		const results = await checkPathDepth([{ path: "src", max: 3 }], cwd, []);
		// src/domain/user/profile/settings/theme.ts = depth 4 (domain/user/profile/settings -> 4 dirs deep)
		// src/domain/user/profile/settings/advanced/config.ts = depth 5
		const deep = results.filter((r) => r.path.includes("settings"));
		expect(deep.length).toBeGreaterThan(0);
		for (const r of deep) {
			expect(r.message).toContain("上限");
			expect(r.severity).toBe("error");
		}
	});

	it("passes when within limits", async () => {
		const results = await checkPathDepth([{ path: "src", max: 10 }], cwd, []);
		expect(results).toHaveLength(0);
	});

	it("counts depth relative to base path", async () => {
		const results = await checkPathDepth(
			[{ path: "src/domain", max: 2 }],
			cwd,
			[],
		);
		// user/profile/settings/theme.ts = depth 3 from domain
		// user/profile/settings/advanced/config.ts = depth 4 from domain
		const violations = results.filter((r) => r.message.includes("上限 2"));
		expect(violations.length).toBeGreaterThan(0);
	});
});
