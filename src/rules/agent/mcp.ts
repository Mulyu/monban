import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import type { AgentMcpRule, RuleResult } from "../../types.js";

const DEFAULT_FORBIDDEN_COMMANDS = ["curl", "wget", "sh", "bash", "zsh"];
const NPX_UNPINNED = /^npx?(\.cmd)?$/;
const NPX_LATEST_ARG = /(?:^|@)latest$/;

interface ServerEntry {
	name: string;
	command?: string;
	args?: unknown[];
	url?: string;
	env?: Record<string, unknown>;
}

export async function checkAgentMcp(
	rules: AgentMcpRule[],
	cwd: string,
	globalExclude: string[],
): Promise<RuleResult[]> {
	const results: RuleResult[] = [];

	for (const rule of rules) {
		const severity = rule.severity ?? "warn";
		const forbidden = new Set(
			rule.forbidden_commands ?? DEFAULT_FORBIDDEN_COMMANDS,
		);
		const checkUnpinnedNpx = rule.unpinned_npx ?? true;
		const checkEnvSecrets = rule.env_secrets ?? true;
		const allowedServers = rule.allowed_servers
			? new Set(rule.allowed_servers)
			: null;
		const forbiddenServers = new Set(rule.forbidden_servers ?? []);

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
					rule: "mcp",
					path: file,
					message: rule.message ?? `${file}: JSON パースに失敗しました。`,
					severity,
				});
				continue;
			}

			const servers = extractServers(parsed);
			if (servers === null) continue; // file does not declare mcpServers; skip silently

			for (const server of servers) {
				if (forbiddenServers.has(server.name)) {
					results.push({
						rule: "mcp",
						path: `${file}:${server.name}`,
						message:
							rule.message ??
							`MCP server が forbidden リストにあります: ${server.name}`,
						severity,
					});
				}
				if (allowedServers && !allowedServers.has(server.name)) {
					results.push({
						rule: "mcp",
						path: `${file}:${server.name}`,
						message:
							rule.message ??
							`MCP server が allowlist にありません: ${server.name}`,
						severity,
					});
				}

				if (server.command && forbidden.has(server.command)) {
					results.push({
						rule: "mcp",
						path: `${file}:${server.name}`,
						message:
							rule.message ??
							`生シェル経由の MCP server: command=${server.command} (任意コード実行の経路)`,
						severity,
					});
				}

				if (
					checkUnpinnedNpx &&
					server.command &&
					NPX_UNPINNED.test(server.command)
				) {
					const args = (server.args ?? []).filter(
						(a): a is string => typeof a === "string",
					);
					const pkgArg = args.find((a) => !a.startsWith("-"));
					if (pkgArg !== undefined) {
						if (!pkgArg.includes("@") || NPX_LATEST_ARG.test(pkgArg)) {
							results.push({
								rule: "mcp",
								path: `${file}:${server.name}`,
								message:
									rule.message ??
									`npx の MCP server がバージョン固定されていません: ${pkgArg} (供給網侵害時に自動被弾)`,
								severity,
							});
						}
					}
				}

				if (checkEnvSecrets && server.env) {
					for (const [key, value] of Object.entries(server.env)) {
						if (typeof value !== "string") continue;
						if (value.includes("${")) continue; // 環境変数展開は OK
						if (looksLikeSecret(key, value)) {
							results.push({
								rule: "mcp",
								path: `${file}:${server.name}.env.${key}`,
								message:
									rule.message ??
									`MCP server の env に直値らしきシークレット (${key}) を検出。\${VAR} 経由で渡してください。`,
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

function extractServers(doc: unknown): ServerEntry[] | null {
	if (!doc || typeof doc !== "object") return null;
	const root = doc as Record<string, unknown>;
	const block = root.mcpServers ?? root.mcp_servers;
	if (!block || typeof block !== "object" || Array.isArray(block)) return null;

	const out: ServerEntry[] = [];
	for (const [name, raw] of Object.entries(block as Record<string, unknown>)) {
		if (!raw || typeof raw !== "object") continue;
		const r = raw as Record<string, unknown>;
		out.push({
			name,
			command: typeof r.command === "string" ? r.command : undefined,
			args: Array.isArray(r.args) ? r.args : undefined,
			url: typeof r.url === "string" ? r.url : undefined,
			env:
				r.env && typeof r.env === "object" && !Array.isArray(r.env)
					? (r.env as Record<string, unknown>)
					: undefined,
		});
	}
	return out;
}

const SECRET_KEY_RE = /(secret|token|key|password|api[_-]?key|credential)/i;

function looksLikeSecret(key: string, value: string): boolean {
	if (value.length < 16) return false;
	return SECRET_KEY_RE.test(key);
}
