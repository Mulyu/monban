# Getting Started

> [日本語](../getting-started.md) | **English**

The fastest path to a first monban run.

## 1. Install

No install is needed for CI — you can invoke monban on demand with `npx`.

```bash
# One-off run (recommended)
npx @mulyu/monban all

# Or install globally
npm install -g @mulyu/monban
```

## 2. Create a configuration file

Place `monban.yml` at the project root. A minimal example:

```yaml
# monban.yml
exclude:
  - "**/node_modules/**"
  - "**/dist/**"

path:
  forbidden:
    - path: "**/utils/**"
      message: "utils/ is disallowed. Put the code in an appropriate module."

content:
  forbidden:
    - path: "src/**"
      pattern: "debugger"

doc:
  link:
    - path: "*.md"
    - path: "docs/**/*.md"
```

See the per-section docs for every available field:

- Path structure: [path.md](path.md)
- File contents: [content.md](content.md)
- Documentation: [doc.md](doc.md)
- GitHub: [github.md](github.md)
- Git metadata: [git.md](git.md)

## 3. Run

```bash
npx @mulyu/monban all
```

Run a single check:

```bash
npx @mulyu/monban path
npx @mulyu/monban content --rule forbidden
npx @mulyu/monban all --json
```

## 4. Wire into CI

GitHub Actions example:

```yaml
- name: monban
  run: npx @mulyu/monban all
```

### Exit codes

monban returns one of three exit codes. Use them in CI to distinguish violations from tooling failures.

| Exit code | Meaning |
|-----------|------|
| `0` | Every check passed |
| `1` | One or more `error`-severity violations were found |
| `2` | Configuration error, YAML parse failure, or other runtime error |

When only `warn`-severity findings are reported, the exit code is still `0` (warnings don't count as violations). Missing `monban.yml` returns `2`. Set `MONBAN_DEBUG=1` to get a stack trace on exit 2.

## 5. Enforce via the agent

When using Claude Code, appending this to `CLAUDE.md` nudges the agent to run the checks after each change:

```markdown
## Post-change verification

After changing code, always run `npx @mulyu/monban all` and confirm every check passes.
```

## Next steps

- To reuse an organization-wide rule set, see [extends.md](extends.md)
- For the design philosophy, see [concepts.md](concepts.md)
