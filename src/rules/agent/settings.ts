import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import type { AgentSettingsRule, RuleResult } from "../../types.js";

const DEFAULT_FORBIDDEN_PERMISSIONS = [
	"^Bash\\(\\*\\)$",
	"^Bash\\(\\*:\\*\\)$",
	"^Bash\\(sudo",
	"^Bash\\(rm",
	"^Bash\\(curl",
	"^Bash\\(wget",
	"^WebFetch\\(\\*\\)$",
];

const DEFAULT_FORBIDDEN_HOOK_COMMANDS = [
	"curl",
	"wget",
	"sh",
	"bash",
	"zsh",
	"sudo",
];

const NPX_IN_COMMAND = /\bnpx?(?:\.cmd)?\s+([^\s;&|]+)/g;
const NPX_LATEST_ARG = /(?:^|@)latest$/;

interface HookCommandEntry {
	event: string;
	command: string;
}

export async function checkAgentSettings(
	rules: AgentSettingsRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const severity = rule.severity ?? "warn";
		const forbiddenPermRegexes = (
			rule.forbidden_permissions ?? DEFAULT_FORBIDDEN_PERMISSIONS
		).map((p) => new RegExp(p));
		const allowedPermRegexes = rule.allowed_permissions?.map(
			(p) => new RegExp(p),
		);
		const forbiddenHookTokens = new Set(
			rule.forbidden_hook_commands ?? DEFAULT_FORBIDDEN_HOOK_COMMANDS,
		);
		const checkUnpinnedNpx = rule.unpinned_npx ?? true;

		const files = await fg(rule.path, {
			cwd,
			dot: true,
			onlyFiles: true,
			ignore: [...globalExclude, ...(rule.exclude ?? [])],
		});

		for (const file of files) {
			const abs = join(cwd, file);
			const raw = await readFile(abs, "utf-8");
			let parsed: unknown;
			try {
				parsed = JSON.parse(raw);
			} catch {
				results.push({
					rule: "settings",
					path: file,
					message: rule.message ?? `${file}: JSON パースに失敗しました。`,
					severity,
				});
				continue;
			}

			for (const entry of extractPermissions(parsed)) {
				for (const re of forbiddenPermRegexes) {
					if (re.test(entry)) {
						results.push({
							rule: "settings",
							path: `${file}:permissions.allow`,
							message:
								rule.message ??
								`危険な permission: ${entry} (広域許可は任意コード実行の経路)`,
							severity,
						});
						break;
					}
				}
				if (
					allowedPermRegexes &&
					!allowedPermRegexes.some((re) => re.test(entry))
				) {
					results.push({
						rule: "settings",
						path: `${file}:permissions.allow`,
						message:
							rule.message ?? `permission が allowlist にありません: ${entry}`,
						severity,
					});
				}
			}

			for (const hook of extractHookCommands(parsed)) {
				const tokens = tokenizeCommand(hook.command);
				for (const token of tokens) {
					if (forbiddenHookTokens.has(token)) {
						results.push({
							rule: "settings",
							path: `${file}:hooks.${hook.event}`,
							message:
								rule.message ??
								`hooks の command に禁止トークンを検出: ${token} (任意コード実行の経路)`,
							severity,
						});
						break;
					}
				}

				if (checkUnpinnedNpx) {
					for (const match of hook.command.matchAll(NPX_IN_COMMAND)) {
						const pkg = match[1];
						if (!pkg.includes("@") || NPX_LATEST_ARG.test(pkg)) {
							results.push({
								rule: "settings",
								path: `${file}:hooks.${hook.event}`,
								message:
									rule.message ??
									`hooks の npx コマンドがバージョン固定されていません: ${pkg} (供給網侵害時に自動被弾)`,
								severity,
							});
						}
					}
				}
			}
		}
	}

	return results;
}

function extractPermissions(doc: unknown): string[] {
	if (!doc || typeof doc !== "object") return [];
	const root = doc as Record<string, unknown>;
	const permissions = root.permissions;
	if (!permissions || typeof permissions !== "object") return [];
	const allow = (permissions as Record<string, unknown>).allow;
	if (!Array.isArray(allow)) return [];
	return allow.filter((v): v is string => typeof v === "string");
}

function extractHookCommands(doc: unknown): HookCommandEntry[] {
	if (!doc || typeof doc !== "object") return [];
	const root = doc as Record<string, unknown>;
	const hooks = root.hooks;
	if (!hooks || typeof hooks !== "object" || Array.isArray(hooks)) return [];

	const out: HookCommandEntry[] = [];
	for (const [event, matchers] of Object.entries(
		hooks as Record<string, unknown>,
	)) {
		if (!Array.isArray(matchers)) continue;
		for (const matcher of matchers) {
			if (!matcher || typeof matcher !== "object") continue;
			const inner = (matcher as Record<string, unknown>).hooks;
			if (!Array.isArray(inner)) continue;
			for (const h of inner) {
				if (!h || typeof h !== "object") continue;
				const cmd = (h as Record<string, unknown>).command;
				if (typeof cmd === "string") {
					out.push({ event, command: cmd });
				}
			}
		}
	}
	return out;
}

function tokenizeCommand(command: string): string[] {
	const tokens: string[] = [];
	for (const raw of command.split(/[\s|;&()<>]+/)) {
		if (!raw) continue;
		const basename = raw.split("/").pop() ?? raw;
		const cleaned = basename.replace(/^["']|["']$/g, "");
		if (cleaned) tokens.push(cleaned);
	}
	return tokens;
}
