# Concepts

> [日本語](./concepts.ja.md) | **English**

## Why monban

Coding agents (Claude Code, Cursor, Copilot, etc.) are good at writing code, but poor at autonomously maintaining structural consistency across a project or keeping documentation in sync with code.

Because agents make a lot of localized changes, the following kinds of drift are common:

- Creating vague directories like `utils/` or `helpers/` without hesitation
- Mixing PascalCase and kebab-case without checking the existing convention
- Mechanically nesting subdirectories, producing needlessly deep structures
- Changing code that a doc references without updating the doc
- Picking up deprecated GitHub Actions from search results
- Confidently suggesting nonexistent dependency names (hallucination / slopsquat)
- Running `git add .` → `git commit` → `git push` in a single turn, skipping human review
- Writing meaningless commit messages like "fix", "update code", or "AI changes"
- Cramming thousands of lines of change into a single PR, making it unreviewable
- Accidentally tracking files listed in `.gitignore` via `git add -A`

monban is a gatekeeper that catches this kind of structural drift in CI or locally. When you only care about newly introduced violations in a PR, the `--diff` flag — available on every command — restricts the check to the diff scope ([diff.md](diff.md)).

## How monban fits with other linters

Traditional linters (ESLint, markdownlint, etc.) focus on language- and format-level concerns. monban complements them by focusing on the *project-structure* layer.

| Tool | Scope |
|---|---|
| ESLint / Biome | Code syntax and style |
| markdownlint | Markdown style |
| commitlint / gitlint | Commit message format |
| **monban** | **Project structure, file contents, doc integrity, dependency-name provenance, Git metadata and change granularity** |

## Design principles

- **Language-agnostic, no AST** — runs on any language. Only filesystem traversal, plain-text regex scans, and YAML/manifest structural parsing.
- **A single `monban.yml`** — one file for all configuration, minimizing learning cost.
- **Globs are the universal selector** — no rule invents its own selector syntax.
- **Cross-org reuse via `extends`** — inherit base rules from GitHub ([extends.md](extends.md)).
- **External network access is contained in `monban deps`** — only dependency-registry lookup uses external APIs. Every other command runs fully offline. In offline environments, `deps --offline` only runs `allowed` / `forbidden`.

## Error handling

monban distinguishes two kinds of errors that can arise during a rule run.

- **Finding** — a violation the rule intentionally returns. `severity: "error"` tells the user to fix and fails CI. `severity: "warn"` notifies the user without failing CI.
- **Execution error** — configuration mismatch, unexpected exception, or any situation where the rule itself cannot continue. These propagate up to the harness and exit the CLI with code 1.

### Network failures

For external I/O, such as the registry lookups in `monban deps`, **a failure is always recorded as a `severity: "warn"` finding**, never silently ignored. This lets the user distinguish "no violations" from "couldn't verify".

The same policy applies to:

- ecosyste.ms API network failures, timeouts, and 5xx responses
- Network unavailability (DNS errors, etc.)

On the other hand, situations that prevent execution outright — broken config or broken manifest structure — propagate as execution errors.

## Out of scope

monban does not wade into the following areas. They belong to existing tools.

- Source-code syntax and type checking (→ tsc, ESLint, Biome)
- Formatting (→ Prettier, Biome)
- Security vulnerability scanning (→ Dependabot, Trivy)
- Test execution (→ Vitest, Jest, etc.)
- Deep secret scanning (→ gitleaks)
- Blocking destructive Git commands at runtime (→ git hooks / the agent's responsibility)
- Branch-name conventions (under consideration)
- PR metadata checks (→ future `monban pr`)
