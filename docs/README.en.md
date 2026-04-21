# monban Documentation

> [日本語](./README.ja.md) | **English**

Index of user-facing monban docs.

## Getting started

- [getting-started.md](getting-started.en.md) — shortest path from install to first run
- [concepts.md](concepts.en.md) — design philosophy and how monban differs from other linters

## Check reference

| Doc | Covers |
|-------------|------|
| [path.md](path.en.md) | Path structure (`forbidden` / `required` / `naming` / `depth` / `count`) |
| [content.md](content.en.md) | File contents (`forbidden` / `required`, BOM, invisible characters, secrets) |
| [doc.md](doc.en.md) | Documentation integrity (`ref` / `link`) |
| [github.md](github.en.md) | GitHub (workflows + CODEOWNERS, 13 rules) |
| [deps.md](deps.en.md) | Dependency packages (`existence` / `freshness` / `popularity` / `cross_ecosystem` / `typosquat` / `allowed` / `forbidden`) |
| [git.md](git.en.md) | Git metadata (`commit.message` / `commit.trailers` / `commit.references` / `diff.size` / `diff.ignored` / `branch_name` / `tag_name`) |
| [agent.md](agent.en.md) | AI agent configuration (`instructions` / `mcp` / `ignore`) |

## CLI

- [diff.md](diff.en.md) — the `--diff` flag (PR diff scoping), shared by all commands

## Configuration

- [extends.md](extends.en.md) — inheriting other YAML configs (local / GitHub)
