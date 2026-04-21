# monban content

> [日本語](./content.ja.md) | **English**

File-contents checks. Language-agnostic regex matching for forbidden and required patterns.

- Language-agnostic, no AST
- Plain-text regex scanning only
- The selector is `path` (a glob pattern) targeting files

```bash
monban content                     # run every rule
monban content --rule forbidden    # run a specific rule only
monban content --diff=main         # scope to a diff (details: ./diff.md)
monban content --json              # JSON output
```

---

## Rule list

| # | Rule | Summary |
|---|--------|------|
| 1 | `required` | Detect missing required text patterns in a file (limitable to the first N lines with `within_lines`) |
| 2 | `forbidden` | Detect forbidden text patterns, BOM, invisible characters, secrets, prompt injection, or merge-conflict markers |
| 3 | `size` | Verify that the file's line count stays under a limit |

---

## Configuration

```yaml
# monban.yml
content:
  required:
    - path: "src/**/*.ts"
      pattern: "^// Copyright \\d{4}"
      scope: first_line
      message: "Copyright header required."

  forbidden:
    - path: "src/domain/**"
      pattern: "process\\.env"
      message: "Do not access environment variables directly from the domain layer."

    - path: "src/**"
      bom: true
      message: "Do not include a BOM."

    - path: "src/**"
      invisible: true
      message: "File contains an invisible Unicode character."

  size:
    - path: "src/**/*.ts"
      max_lines: 300
      exclude: ["src/generated/**"]
      message: "File is too large. Split it up."
```

---

## 1. required

<!-- monban:ref ../src/rules/content/required.ts sha256:e63e65945a1cfcc349914a9516379c52419c04d58d5d4b078d6903723d753c73 -->

Declare text patterns that a file must contain.

Use it for boilerplate text every file should carry — copyright headers, license notices, and so on.

### Configuration

```yaml
content:
  required:
    - path: "src/**/*.ts"
      pattern: "^// Copyright \\d{4}"
      scope: first_line
      message: "Copyright header required."

    - path: "**/*.rb"
      pattern: "^# frozen_string_literal: true"
      scope: first_line

    - path: "packages/*/src/**/*.ts"
      pattern: "@license MIT"
      scope: file

    # Generated files must carry a DO NOT EDIT marker within the first 3 lines
    - path: "src/generated/**/*.{ts,go}"
      pattern: "(@generated|DO NOT EDIT)"
      within_lines: 3
      message: "Generated files must carry a DO NOT EDIT marker at the top."
```

### Fields

| Field | Type | Required | Default | Description |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | Glob pattern for target files |
| `exclude` | string[] | No | `[]` | Glob patterns to exclude from targets |
| `pattern` | string | Yes | — | Required regex pattern |
| `json_key` | string | No | — | Dot-delimited key path into a JSON file. When set, requires the key to exist and its value to match `pattern` (cannot be combined with `scope` / `within_lines`) |
| `scope` | `"file"` \| `"first_line"` \| `"last_line"` | No | `"file"` | Match scope |
| `within_lines` | integer | No | — | Restrict the match to the first N lines (only meaningful when `scope` is `"file"`) |
| `message` | string | No | — | Error message |

`scope: "first_line"` is equivalent to `within_lines: 1`. Use `within_lines` when you want a multi-line header (for example, a `@generated` / `DO NOT EDIT` marker that may appear anywhere in the first 2–3 lines).

When `json_key` is set, the target file is parsed as JSON; the rule requires the key to exist and its value to match `pattern`. If the key is missing or the value does not match, it is a violation. Example:

```yaml
content:
  required:
    # package.json must declare a license
    - path: "package.json"
      json_key: "license"
      pattern: ".+"
```

### Example output

```
ERROR [required] src/billing/invoice.ts
  required pattern not found: ^// Copyright \d{4} (first_line)
  Copyright header required.

ERROR [required] src/generated/api.ts
  required pattern not found: (@generated|DO NOT EDIT) (within first 3 lines)
  Generated files must carry a DO NOT EDIT marker at the top.
```

---

## 2. forbidden

<!-- monban:ref ../src/rules/content/forbidden.ts sha256:71b92106e4fef145863246b77d05a07b41dbd53f90c84263bc2efb5a144d65ff -->

Declare things that must not appear in a file. A single rule shape handles six kinds: text patterns, BOM, invisible Unicode characters, secrets, prompt injection, and merge-conflict markers. In addition, the `json_key` modifier lets you target a specific key inside a JSON file and pattern-match its value.

Specify at least one of `pattern`, `json_key`, `bom`, `invisible`, `secret`, `injection`, `conflict`. `json_key` cannot be combined with byte-level flags (`bom` / `invisible` / `secret` / `injection` / `conflict`).

### Configuration

```yaml
content:
  forbidden:
    # --- text patterns ---

    # Layer constraints
    - path: "src/domain/**"
      pattern: "process\\.env"
      message: "Do not access environment variables directly from the domain layer."
    - path: "src/domain/**"
      pattern: "console\\.(log|error|warn)"
      message: "Do not emit console output from the domain layer."

    # Debug code
    - path: "src/**"
      pattern: "debugger"
    - path: "**/*.py"
      pattern: "^import pdb|pdb\\.set_trace"
    - path: "**/*.go"
      pattern: "fmt\\.Println"
      severity: warn

    # --- BOM ---

    - path: "src/**"
      bom: true
      message: "Do not include a BOM."

    # --- invisible Unicode characters ---

    - path: "src/**"
      invisible: true
      message: "File contains an invisible Unicode character."

    # --- secrets ---

    - path: "src/**"
      secret: true
      message: "Possible secret detected."

    # --- prompt injection ---

    - path: "**/*.md"
      injection: true
      message: "Suspicious instruction detected in agent-facing documentation."
    - path: "AGENTS.md"
      injection: true
    - path: ".mcp.json"
      injection: true

    # --- merge-conflict markers ---

    - path: "**"
      conflict: true
      message: "Unresolved merge conflict markers remain."

    # --- JSON specific keys (json_key) ---

    # Forbid curl | sh / rm -rf in any lifecycle script of package.json
    - path: "package.json"
      json_key: "scripts.*"
      pattern: "curl|wget|\\brm\\s+-rf"
      message: "Do not include dangerous shell operations in lifecycle scripts."

    # Forbid the mere existence of a specific key (pattern omitted)
    - path: "package.json"
      json_key: "scripts.preinstall"
      message: "A preinstall script is not needed."
```

### Fields

| Field | Type | Required | Default | Description |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | Glob pattern for target files |
| `exclude` | string[] | No | `[]` | Glob patterns to exclude (for exempting specific directories) |
| `pattern` | string | No* | — | Forbidden regex pattern (matched per line, or against the value when combined with `json_key`) |
| `json_key` | string | No* | — | Dot-delimited key path into a JSON file. A trailing `*` expands one level as a wildcard. When set, the rule does not do line-level matching |
| `bom` | boolean | No* | — | `true` to forbid BOM |
| `invisible` | boolean | No* | — | `true` to forbid invisible Unicode characters |
| `secret` | boolean | No* | — | `true` to forbid known secret formats |
| `injection` | boolean | No* | — | `true` to detect prompt-injection indicators |
| `conflict` | boolean | No* | — | `true` to detect merge-conflict markers |
| `message` | string | No | — | Error message |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | Severity |

\* At least one of `pattern`, `json_key`, `bom`, `invisible`, `secret`, `injection`, `conflict` is required. `json_key` cannot be combined with byte-level flags (`bom` / `invisible` / `secret` / `injection` / `conflict`).

### pattern algorithm

1. Read the target file line by line
2. Match each line against `new RegExp(pattern)`
3. Report matching lines (with line numbers)

### json_key algorithm

1. Parse the target file as JSON (parse failures are reported as findings with `severity`, not raised as execution errors)
2. Traverse `json_key` as a dot-delimited path
   - Example: `scripts.postinstall` → look up `doc.scripts.postinstall`
   - `*` is a one-level wildcard. Example: `scripts.*` expands to every child key under `scripts`
3. For each resolved key:
   - If `pattern` is set and the value is a string, match it against the regex
   - If `pattern` is omitted, the **mere existence of the key is a violation**
4. Report matches in `<file>:<key>` form

Use `json_key` for checks like "ensure no dangerous shell operations appear in `package.json` scripts.*", "the URL hosts in a lockfile are in an allowlist", or specific-key checks on config files such as `renovate.json` / `dependabot.yml` (YAML is not yet supported).

### bom algorithm

1. Read the first 3 bytes of the file
2. If a UTF-8 BOM (`0xEF 0xBB 0xBF`) is present, report

### invisible algorithm

Reports any character from the following categories:

| Char | Codepoint | Name |
|------|--------------|------|
| ​ | `U+200B` | Zero Width Space |
| ‌ | `U+200C` | Zero Width Non-Joiner |
| ‍ | `U+200D` | Zero Width Joiner |
| ⁠ | `U+2060` | Word Joiner |
| ­ | `U+00AD` | Soft Hyphen |
| ﻿ | `U+FEFF` | Zero Width No-Break Space (mid-line) |
| ⁡ | `U+2061` | Function Application |
| ⁢ | `U+2062` | Invisible Times |
| ⁣ | `U+2063` | Invisible Separator |
| ⁤ | `U+2064` | Invisible Plus |

### secret algorithm

Performs line-level regex matching against known secret formats. Built-in detectors:

| Detector | Target |
|--------|------|
| AWS Access Key ID | 20 alphanumeric characters starting with `AKIA` |
| GitHub Personal Access Token | `ghp_` + 36 chars |
| GitHub OAuth Token | `gho_` + 36 chars |
| GitHub App Token | `ghu_` / `ghs_` + 36 chars |
| GitHub Refresh Token | `ghr_` + 36 chars |
| Google API Key | `AIza` + 35 chars |
| Slack Token | `xoxb-` / `xoxa-` / `xoxp-` / `xoxr-` / `xoxs-` |
| Stripe Live Key | `sk_live_` / `pk_live_` / `rk_live_` + 24+ chars |
| NPM Token | `npm_` + 36 chars |
| JWT | Three-section structure of the form `eyJ...eyJ...<signature>` |
| Private Key Block | `-----BEGIN (RSA\|OPENSSH\|DSA\|EC\|PGP) PRIVATE KEY-----` |

To avoid false positives, only known formats are detected — no entropy heuristics.

### injection algorithm

Detects indirect prompt injection targeting AI agents (Claude / Cursor / Copilot etc.). Apply it to text the agent reads — `README.md`, `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, PR templates, and so on.

Three categories:

| Category | Detection |
|---------|---------|
| Unicode Tag block | `U+E0000`–`U+E007F` (virtually no legitimate use; commonly abused to hide injections) |
| Bidi control characters | `U+202A`–`U+202E`, `U+2066`–`U+2069` (Trojan Source attacks) |
| Instruction-override phrases | `ignore previous instructions` / `disregard ... system prompt` / `you are now ...` / `forget everything` / `new system prompt:` etc. (case-insensitive) |

`invisible` and `injection` do not overlap in targets (`invisible` includes characters that can be legitimate, like zero-width space; `injection` targets attack-only strings). Enabling both does not produce duplicate reports.

### conflict algorithm

Line-leading match for the three Git merge-conflict markers:

| Marker | Detection |
|---------|------|
| `<<<<<<<` | 7 `<` characters at the start of a line |
| `=======` | A line that is exactly 7 `=` characters (mid-line equals separators are not matched) |
| `>>>>>>>` | 7 `>` characters at the start of a line |

### Example output

```
ERROR [forbidden] src/domain/order/service.ts:15
  forbidden pattern matched: process.env
  Do not access environment variables directly from the domain layer.

ERROR [forbidden] src/config/defaults.ts
  BOM (Byte Order Mark) detected.
  Do not include a BOM.

ERROR [forbidden] src/handlers/payment.ts:42
  invisible Unicode character: U+200B (Zero Width Space)
  File contains an invisible Unicode character.

ERROR [forbidden] src/handlers/webhook.ts:8
  secret detected: AWS Access Key ID
  Possible secret detected.

ERROR [forbidden] AGENTS.md:42
  possible prompt injection: instruction-override phrase detected
  Suspicious instruction detected in agent-facing documentation.

ERROR [forbidden] src/legacy/module.ts:12
  merge-conflict marker detected: start marker (<<<<<<<)
  Unresolved merge conflict markers remain.
```

---

## 3. size

<!-- monban:ref ../src/rules/content/size.ts sha256:0c136a6bcc0a68958ef21e1ddebd9af9893c8e02c823b6ac6ff71ba5cb3db5b4 -->

Verify that a file's line count stays under a threshold. Coding agents tend to cram functionality into one file; this rule surfaces bloat from a readability and responsibility-split perspective.

### Configuration

```yaml
content:
  size:
    - path: "src/**/*.ts"
      max_lines: 300
      exclude: ["src/generated/**"]
      message: "File is too large. Split it up."

    - path: "src/rules/**/*.ts"
      max_lines: 150   # keep per-rule files small
      severity: warn
```

### Fields

| Field | Type | Required | Default | Description |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | Glob pattern for target files |
| `exclude` | string[] | No | `[]` | Glob patterns to exclude from targets |
| `max_lines` | integer | Yes | — | Maximum allowed line count (exceeding reports a violation) |
| `message` | string | No | — | Error message |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | Severity |

### Algorithm

1. Read the target file
2. Count lines (trailing blank lines excluded)
3. If it exceeds `max_lines`, report

### Example output

```
ERROR [size] src/cli.ts
  412 lines exceeds limit 300.
  File is too large. Split it up.
```

---

## Common output

```
$ monban content

monban content — content checks

  ✗ forbidden     5 violations
  ✗ required      1 violation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  6 violations (5 errors, 1 warning)
  0/2 rules passed
```
