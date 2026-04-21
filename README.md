# monban

> [日本語](./README.ja.md) | **English**

> A guardhouse for coding agents. The gatekeeper checks whether code is allowed through the checkpoint.

**monban** is a harness CLI that statically inspects code generated or edited by coding agents (Claude Code, Cursor, Copilot, etc.) — in CI or locally.

Language-agnostic. No AST required. Works on projects in any language.

For the design philosophy, see [docs/concepts.md](docs/concepts.md).

---

## Checks

| Command | Target | Docs |
|---------|------|-------------|
| `monban path` | File and directory existence, naming, depth, count | [docs/path.md](docs/path.md) |
| `monban content` | Regex-based forbidden/required patterns, BOM, invisible characters, secrets | [docs/content.md](docs/content.md) |
| `monban doc` | Doc reference hashes and broken links | [docs/doc.md](docs/doc.md) |
| `monban github` | GitHub Actions workflows (pinning, permissions, triggers, etc.) and CODEOWNERS | [docs/github.md](docs/github.md) |
| `monban deps` | Validate manifest dependency names against registries: existence, freshness, popularity, similarity | [docs/deps.md](docs/deps.md) |
| `monban git` | Commit messages, trailers, issue references, change granularity, ignore bypasses | [docs/git.md](docs/git.md) |

The `--diff` flag, which scopes a run to a PR diff, works on every command ([docs/diff.md](docs/diff.md)). For reusing organization-wide rule sets, see [docs/extends.md](docs/extends.md).

---

## Install

```bash
# Global install
npm install -g @mulyu/monban

# One-off run (recommended for CI)
npx @mulyu/monban all
```

> The package name is `@mulyu/monban`, but the installed command is `monban`.

See [docs/getting-started.md](docs/getting-started.md) for the fastest path to a first run.

---

## Usage

```bash
# Run every check
monban all

# Run checks individually
monban path
monban content
monban doc
monban github
monban deps
monban git

# Run a single rule
monban path --rule forbidden

# Scope to a PR diff
monban all --diff=main

# JSON output
monban all --json
```

---

## Configuration

Place `monban.yml` at the project root. See the per-command docs for the configuration fields.

```yaml
# monban.yml
extends:
  - type: local
    path: "./shared/base.yml"

exclude:
  - "**/node_modules/**"
  - "**/dist/**"

path:    { ... }   # docs/path.md
content: { ... }   # docs/content.md
doc:     { ... }   # docs/doc.md
github:  { ... }   # docs/github.md
deps:    { ... }   # docs/deps.md
git:     { ... }   # docs/git.md
```

---

## Coding agent integration

### Claude Code

Add the following to `CLAUDE.md` to encourage the agent to run the checks after every change:

```markdown
## Post-change verification

After changing code, always run `npx @mulyu/monban all` and confirm every check passes.
```

#### Install as a plugin (recommended)

The monban skill and the `/monban:init` command can be installed through the Claude Code marketplace.

```text
/plugin marketplace add Mulyu/monban
/plugin install monban@mulyu
/reload-plugins
```

- `monban` skill: supplies the command table, output interpretation, fix workflow, and `monban.yml` conventions to the agent
- `/monban:init`: surveys an existing project and generates a `monban.yml` scaffold

The marketplace manifest is at [.claude-plugin/marketplace.json](.claude-plugin/marketplace.json); the plugin itself is at [plugins/monban/](plugins/monban/).

### GitHub Actions

```yaml
- name: monban
  run: npx @mulyu/monban all --diff=${{ github.event.pull_request.base.sha }}
```

Omitting `--diff` runs a full scan. For PR review, passing the base SHA so only the diff is checked is the recommended setup.

---

## Docs

- [Getting started](docs/getting-started.md)
- [Concepts](docs/concepts.md)
- [Docs index](docs/README.md)

---

## License

MIT
