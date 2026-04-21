# monban agent

> [日本語](../agent.md) | **English**

Validates the integrity of repository configuration files used by AI agents (Claude / Cursor / Copilot etc.): `AGENTS.md` / `CLAUDE.md` / `.mcp.json` / AI ignore files.

- Responds to the surge of MCP-related CVEs in 2025–2026 (CVE-2025-68143/68144/68145, CVE-2025-53773, CVE-2025-6515, etc.)
- Enforces quality of agent-facing docs (required sections, size limit, frontmatter shape)
- Ensures AI ignore files cover sensitive files like `.env*` / `*.pem` / `id_rsa`

```bash
monban agent                        # run every rule
monban agent --rule mcp             # run a specific rule only
monban agent --json                 # JSON output
```

---

## Rule list

| # | Rule | Target | Summary |
|---|--------|------|------|
| 1 | `instructions` | `AGENTS.md` / `CLAUDE.md` | Existence, required H2 sections, size cap, frontmatter key allowlist |
| 2 | `mcp` | `.mcp.json` / `.claude/settings.json` / `.cursor/mcp.json` | allowed/forbidden under `mcpServers`, raw-shell ban, `npx @latest` ban, raw-value secret detection in env |
| 3 | `ignore` | `.llmignore` / `.aiexclude` / `.claudeignore` / `.cursorignore` | Required coverage of `.env*` / `*.pem` / `id_rsa` etc. |

---

## Configuration

```yaml
# monban.yml
agent:
  instructions:
    - path: "AGENTS.md"
      required_sections: [Commands, Testing, Style, Boundaries]
      max_bytes: 12288
      allowed_frontmatter_keys: [description, tags]

  mcp:
    - path: "{.mcp.json,.claude/settings.json,.cursor/mcp.json}"
      forbidden_commands: [curl, wget, sh, bash, zsh]
      unpinned_npx: true
      env_secrets: true

  ignore:
    - path: ".llmignore"
      required: [".env", ".env.*", "*.pem", "id_rsa", "**/secrets/**"]
```

---

## 1. instructions

<!-- monban:ref ../../src/rules/agent/instructions.ts sha256:2ade7a48cff681b5368b896ae6b6bb94f0a4d6e8a27f7dd94c4c1c5c11f1529a -->

Validates the structure of agent instruction files (`AGENTS.md` / `CLAUDE.md`).

### Configuration

```yaml
agent:
  instructions:
    - path: "AGENTS.md"
      required_sections: [Commands, Testing, Style, Boundaries]
      max_bytes: 12288
      allowed_frontmatter_keys: [description, tags]
      severity: warn
```

### Fields

| Field | Type | Required | Default | Description |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | Glob for target files |
| `exclude` | string[] | No | `[]` | Exclude glob |
| `required_sections` | string[] | No | — | Required H2 headings (case-insensitive) |
| `max_bytes` | integer | No | — | Size cap (agents tend to truncate files above this) |
| `allowed_frontmatter_keys` | string[] | No | — | Allowed keys when a `---` frontmatter block is present |
| `message` | string | No | — | Custom message |
| `severity` | `"error"` \| `"warn"` | No | `"warn"` | Severity |

### Algorithm

1. Enumerate files matching `path`. If no match, report a "not found" violation.
2. For each file:
   - If `max_bytes` is set, check file size
   - If `required_sections` is set, extract `^## <name>\s*$` H2 headings and compare against the required list
   - If `allowed_frontmatter_keys` is set, parse the leading `---\n...\n---` block as YAML and flag keys outside the allowlist

### Example output

```
WARN  [instructions] AGENTS.md
  required section not found: ## Boundaries

WARN  [instructions] AGENTS.md
  size 15432 B exceeds limit 12288 B (agents may ignore files that are too large).
```

---

## 2. mcp

<!-- monban:ref ../../src/rules/agent/mcp.ts sha256:f54ac3ca9ca459d702ab7062818b158ad7548e81bb64743d250a66ac21cc40a1 -->

Validates the structure and safety of MCP (Model Context Protocol) configuration files. Targets `.mcp.json` / `.claude/settings.json` / `.cursor/mcp.json`.

### Configuration

```yaml
agent:
  mcp:
    - path: "{.mcp.json,.claude/settings.json,.cursor/mcp.json}"
      forbidden_commands: [curl, wget, sh, bash, zsh]
      unpinned_npx: true
      env_secrets: true
      allowed_servers: [github, filesystem]
      severity: error
```

### Fields

| Field | Type | Required | Default | Description |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | Glob for target files |
| `exclude` | string[] | No | `[]` | Exclude glob |
| `forbidden_commands` | string[] | No | `[curl, wget, sh, bash, zsh]` | Raw shell commands to forbid |
| `unpinned_npx` | boolean | No | `true` | Forbid `npx pkg@latest` / unspecified versions |
| `env_secrets` | boolean | No | `true` | Flag env raw values that match a secret format (`${VAR}` expansion is OK) |
| `allowed_servers` | string[] | No | — | When set, only these names are allowed |
| `forbidden_servers` | string[] | No | `[]` | Explicitly forbidden server names |
| `message` | string | No | — | Custom message |
| `severity` | `"error"` \| `"warn"` | No | `"warn"` | Severity |

### Algorithm

Parse the target file as JSON, then inspect each server under `mcpServers`:

- **forbidden_commands**: If the `command` field appears in the list, report (e.g. `"command": "bash"`).
- **unpinned_npx**: If `command` is `npx` or `npx.cmd`, and a package name in `args` lacks a version pinning or ends in `@latest`, report.
- **env_secrets**: If an `env` value is a string that does not include `${...}`, the key name contains `token/secret/key/password/api_key/credential`, and the value is 16 characters or longer, report.
- **allowed_servers / forbidden_servers**: allowlist / forbidden list on server name.

### Example output

```
WARN  [mcp] .mcp.json:dangerous
  MCP server via raw shell: command=bash (path to arbitrary code execution)

WARN  [mcp] .mcp.json:unpinned
  npx MCP server is not version-pinned: @modelcontextprotocol/server-foo@latest (auto-impacted by supply-chain compromise)

WARN  [mcp] .mcp.json:hardcoded-secret.env.GITHUB_TOKEN
  Raw secret-like value detected in MCP server env (GITHUB_TOKEN). Pass it via ${VAR} instead.
```

### Background: 2025–2026 MCP CVEs

The `mcp` rule responds to MCP-related supply-chain attacks:

- **CVE-2025-68143 / 68144 / 68145**: Prompt injection in Anthropic's official Git MCP server
- **CVE-2025-53773**: GitHub Copilot RCE via prompt injection
- **CVE-2025-6515**: MCP prompt hijacking (JFrog disclosure)
- **CVE-2025-5277 / 5276 / 5273**: aws-mcp-server command injection / markdownify SSRF

Many of these make the configuration file itself an attack surface. This rule aims to catch the risk at the point the `.mcp.json` is committed.

---

## 3. ignore

<!-- monban:ref ../../src/rules/agent/ignore.ts sha256:ff759a122865b1848c4a9aba8bf9bcb6651d9b7a9ad89f401e1243e3f8bcfe35 -->

Validates that AI ignore files (`.llmignore` / `.aiexclude` / `.claudeignore` / `.cursorignore`) cover sensitive files.

### Configuration

```yaml
agent:
  ignore:
    - path: ".llmignore"
      required:
        - ".env"
        - ".env.*"
        - "*.pem"
        - "id_rsa"
        - "id_rsa.*"
        - "**/secrets/**"
```

### Fields

| Field | Type | Required | Default | Description |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | Glob for target files |
| `exclude` | string[] | No | `[]` | Exclude glob |
| `required` | string[] | No | Six standard sensitive-file patterns | Patterns that must be present (otherwise report) |
| `message` | string | No | — | Custom message |
| `severity` | `"error"` \| `"warn"` | No | `"warn"` | Severity |

### Algorithm

1. Read the target file line by line, stripping `#` comments
2. Collect each line as an ignore pattern (`!negation` lines are stored without the `!`)
3. For each required entry, check presence with strict equality

Wildcard matching is **not** performed. monban does not reason that "`.env.local` is covered because `.env.*` matches"; it requires **`.env.*` to be listed explicitly** in the configuration. This enforces "cover it explicitly" discipline.

### Example output

```
WARN  [ignore] .llmignore
  missing required coverage: .env.* is not listed in the ignore file.

WARN  [ignore] .llmignore
  missing required coverage: *.pem is not listed in the ignore file.
```

---

## Common output

```
$ monban agent

monban agent — agent checks

  ✗ instructions          2 violations (warn)
  ✗ mcp                   3 violations (warn)
  ✗ ignore                2 violations (warn)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  7 violations (7 warnings)
  0/3 rules passed
```

## Out of scope

`monban agent` does not cover the following — they belong elsewhere:

- Detecting maliciousness of the MCP server itself → public registries / code review
- The **correctness of content** inside `AGENTS.md` (e.g. whether a build command actually exists) → other tools (AgentLinter / cclint, etc.)
- Cross-file rule consistency between ignore files (e.g. "no diff between `.aiexclude` and `.cursorignore`") → deferred until the `.llmignore` spec stabilizes
