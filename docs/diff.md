# The --diff flag

> [日本語](./diff.ja.md) | **English**

A CLI flag shared by `monban all` / `monban path` / `monban content` / `monban doc` / `monban github` / `monban deps` / `monban git`. Restricts the scope of a run.

For PR review, this reports **only the violations newly introduced by the current change** — no re-surfacing of long-standing TODOs or legacy layout issues on every run.

- Not a new command — a flag that modifies existing command behavior
- Uses `git merge-base` and `git diff --name-only` to enumerate target files
- Language-agnostic and AST-free design is preserved

```bash
monban all --diff=main                 # restrict to diff against main
monban content --diff                  # auto-detect
monban deps --diff=HEAD~3..HEAD        # arbitrary revision range
monban all --diff=main --diff-granularity=line   # inspect only added lines
```

---

## Scope selection

Priority for the `--diff` target file set:

| Priority | Condition | Base |
|---|---|---|
| 1 | Explicit `--diff=<ref>` | `<ref>` |
| 2 | `--diff` alone, inside CI | `GITHUB_BASE_REF` or equivalent PR base SHA |
| 3 | `--diff` alone, running locally | `git merge-base origin/main HEAD`, falling back to `git merge-base main HEAD` |
| 4 | No flag | Full scan (legacy behavior) |

`<ref>` accepts a commit hash, a branch name, an `A..B` revision range, or shortcuts like `pr:123`.

```bash
monban all --diff=main
monban all --diff=origin/main
monban all --diff=HEAD~3
monban all --diff=a1b2c3..HEAD
```

### CI auto-detection

On GitHub Actions, if any of the following environment variables is set, `--diff` alone is enough to resolve the base:

| Env var | Purpose |
|---|---|
| `GITHUB_BASE_REF` | Pull request base branch |
| `GITHUB_EVENT_PATH` | `pull_request.base.sha` extracted from the event payload |

Outside CI, monban tries `git merge-base origin/main HEAD`, then falls back to `main HEAD`. If neither resolves, it exits with code 2.

---

## Granularity

`--diff-granularity` determines the granularity at which the diff is applied.

| Value | Behavior |
|---|---|
| `file` (default) | Inspect the entire added/modified file |
| `line` | Inspect only the added lines (the add-only set from `git diff --unified=0`) |

Line granularity reduces false positives, but can miss:

- Call-site breakage caused by deleting a function
- Leftover unused imports after removing a dependency
- Manifest-structure dependency integrity (`deps` rules operate at file granularity by default)

For this reason, the default is file granularity. Use `line` for the typical "only flag newly added TODOs or console.logs in this PR" use case.

### Per-rule granularity

| Command | `file` behavior | `line` behavior |
|---|---|---|
| `path` | Inspect only added/modified files | `line` is meaningless (always treated as `file`) |
| `content` | Inspect the entire modified file | Inspect only added lines |
| `doc` | Inspect only modified Markdown | Inspect only the links and `monban:ref` markers in added lines |
| `github` | Inspect only modified workflows | Inspect only added lines (the YAML structural analysis still extends to the enclosing job/step) |
| `deps` | Inspect **newly added** dependencies in modified manifests (exclude pre-existing deps) | Same as `file` |
| `git` | Inspect commits in the range given to `--diff` (`diff.ignored` is limited to newly added files) | Same as `file` |

For rules that inspect an *absence* (e.g. `path.required`), when `--diff` is set monban promotes the check back to a full scan if the related directory appears in the diff.

---

## GitHub Actions integration

When you use `mulyu/monban-action`, passing `base` is enough; monban computes the diff on its side.

```yaml
- uses: mulyu/monban-action@v1
  with:
    base: ${{ github.event.pull_request.base.sha }}
```

Calling from a plain GitHub Actions step:

```yaml
- name: monban (diff only)
  run: npx @mulyu/monban all --diff=${{ github.event.pull_request.base.sha }}
```

On non-PR pushes, drop `--diff` or pass an explicit base such as `main`.

---

## Example run

```
$ monban all --diff=main

monban path     — 1 new file checked
monban content  — added lines only; existing TODOs skipped
monban doc      — checked only references inside modified Markdown
monban github   — checked only changes in .github/workflows
monban deps     — checked only the 3 newly added deps in package.json
monban git      — inspected the commit range main...HEAD

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[deps]    1 error
  package.json:5 ai-json-helper — not found in npm registry

[content] 2 errors
  src/handlers/payment.ts:42 invisible Unicode character
  src/db.ts:18 forbidden pattern matched: debugger

Summary: 3 errors. Blocking merge.
```

---

## Notes

- `--diff` only works inside a git repository. Outside git, monban warns and falls back to a full scan.
- Merge commits as the base can bloat the diff. Passing the tip of a named branch (`--diff=origin/main`) is usually recommended.
- For the initial commit (no parent), `--diff` treats every file as in scope.
