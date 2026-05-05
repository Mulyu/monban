# monban git

> [日本語](./git.ja.md) | **English**

Checks Git metadata and change granularity. Designed to catch, in CI, the kinds of Git mistakes and convention drift that coding agents commonly cause.

- Uses only standard Git commands (`git log`, `git diff --numstat`, `git ls-files`, etc.)
- No extra npm dependencies (operates via `child_process` and the already-bundled `picomatch`)
- The selector is not `path` (a glob); this command operates over a commit range and file set

```bash
monban git                          # run every sub-rule
monban git --rule commit.message    # run a specific sub-rule only
monban git --rule diff.ignored
monban git --diff=main              # set the diff scope (details: ./diff.md)
monban git --diff=origin/main...HEAD
monban git --json                   # JSON output
```

---

## Rule list

| # | Rule | Summary |
|---|--------|------|
| 1 | `commit.message` | Check commit message format, length, and forbidden words |
| 2 | `commit.trailers` | Enforce forbidden/required/allowed trailers (e.g. `Co-authored-by`) |
| 3 | `commit.references` | Require an issue / ticket number reference |
| 4 | `diff.size` | Check the PR change-granularity limit (file and line counts) |
| 5 | `diff.ignored` | Detect files that match `.gitignore` but are tracked |
| 6 | `branch_name` | Check that the current branch name matches a convention regex |
| 7 | `tag_name` | Check that repository tag names match a convention regex (SemVer, etc.) |

---

## Scope resolution

`monban git` determines the commit range by the following priority. Same order as the `--diff` flag:

| Priority | Condition | Base |
|---|---|---|
| 1 | Explicit `--diff=<ref>` | `<ref>...HEAD` range |
| 2 | CI environment (`GITHUB_ACTIONS`, etc.) | Resolved from `GITHUB_HEAD_REF` / `GITHUB_BASE_REF` |
| 3 | On a feature branch | Diff against `git merge-base main HEAD` |
| 4 | Otherwise | The latest commit / staged changes |

### Detached HEAD on CI

Because GitHub Actions PR events run in detached HEAD, monban resolves the base in this order:

1. `GITHUB_HEAD_REF` / `GITHUB_BASE_REF`
2. `GITHUB_REF_NAME`
3. `git rev-parse --abbrev-ref HEAD` (fallback)

### Note on shallow clones

`actions/checkout@v4` defaults to `fetch-depth: 1`, which loses history and makes the check range inaccurate. Recommended:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
```

---

## Configuration

```yaml
# monban.yml
git:
  commit:
    message:
      preset: conventional
      subject_max_length: 72
      forbidden_subjects: ["fix", "update", "wip"]
      ignore_merges: true
      severity: error

    trailers:
      deny:
        - key: "Co-authored-by"
          value_pattern: "(Claude|Copilot|Cursor)"
      severity: error

    references:
      required: true
      patterns: ["#\\d+", "PROJ-\\d+"]
      scope: any
      ignore_patterns: ["^chore\\(deps\\):"]
      severity: error

  diff:
    size:
      max_files: 30
      max_total_lines: 1500
      exclude:
        - "**/*.lock"
        - "**/__snapshots__/**"
      severity: warn

    ignored:
      scope: diff
      severity: warn
```

---

## 1. commit.message

<!-- monban:ref ../src/rules/git/commit-message.ts sha256:1f724c5bdb6b9257a5e215558fcf553501c538b92bbdb673a5236d2b35825780 -->

Checks commit message format, length, and forbidden words.

Target commits are fetched with `git log --no-merges --format='%H%x00%B%x00' <base>..<head>`.

### Configuration

```yaml
git:
  commit:
    message:
      # Preset (only `conventional` ships today)
      preset: conventional

      # Regex used when no preset is specified
      pattern: "^(feat|fix|chore|docs|refactor|test|perf)(\\(.+\\))?!?: .+"

      # Subject length (code-point units)
      subject_max_length: 72
      subject_min_length: 10

      # Minimum body length (0 allows empty body)
      body_min_length: 0

      # Reject when the full subject matches one of these
      forbidden_subjects:
        - "fix"
        - "update"
        - "wip"
        - "misc"
        - "changes"

      ignore_merges: true
      ignore_reverts: true

      severity: error
```

### Fields

| Field | Type | Default | Description |
|-----------|-----|-----------|------|
| `preset` | `"conventional"` | — | Preset. When set, overrides `pattern` |
| `pattern` | string | — | Regex for checking the subject |
| `subject_max_length` | number | `72` | Max subject length (code-point units) |
| `subject_min_length` | number | `1` | Min subject length |
| `body_min_length` | number | `0` | Min body length (0 allows empty body) |
| `forbidden_subjects` | string[] | `[]` | Subject strings forbidden by exact match |
| `ignore_merges` | boolean | `true` | Skip merge commits |
| `ignore_reverts` | boolean | `true` | Skip revert commits |
| `severity` | `"error"` \| `"warn"` | `"error"` | Severity |

### Presets

| Name | Regex |
|------|---------|
| `conventional` | `^(feat\|fix\|chore\|docs\|refactor\|test\|perf\|ci\|build\|style)(\(.+\))?!?: .+` |

### Example output

```
ERROR [commit.message] a1b2c3d
  subject exceeds 72 chars (76):
  "feat(auth): add OAuth2 integration with Google, GitHub, and Microsoft providers"

ERROR [commit.message] d4e5f6g
  subject is a forbidden keyword: "fix"
```

---

## 2. commit.trailers

<!-- monban:ref ../src/rules/git/commit-trailers.ts sha256:9cc2abac08c13b2811206aab43213f29e02ca4ef9099d7f4862d328ef5e60045 -->

Enforces policy on trailers (`Co-authored-by`, `Signed-off-by`, `AI-Assistant`, etc.).

Trailer extraction uses `git interpret-trailers --parse` (a standard Git command).

**Default policy**: `forbidden` / `required` / `allowed` are all empty by default. Users opt in as needed. Because org-level stance on AI-attribution trailers (`Co-authored-by: Claude` etc.) varies, monban's defaults forbid nothing.

### Configuration

```yaml
git:
  commit:
    trailers:
      # Forbid specific trailers
      forbidden:
        - key: "Co-authored-by"
          value_pattern: "(Claude|Copilot|Cursor|ChatGPT|Gemini)"
          message: "AI Co-authored-by is forbidden by organization policy"
        - key: "Generated-by"

      # Require specific trailers
      required:
        - key: "Signed-off-by"
          message: "Signed-off-by is required for DCO compliance"

      # Explicitly allow (takes precedence over `forbidden`)
      allowed:
        - key: "AI-Assistant"

      severity: error
```

### Fields

**forbidden entry**

| Field | Type | Required | Description |
|-----------|-----|------|------|
| `key` | string | Yes | Trailer key (case-insensitive) |
| `value_pattern` | string | No | Regex (substring) against the value. If omitted, the key's existence alone violates |
| `message` | string | No | Error message |

**required entry**

| Field | Type | Required | Description |
|-----------|-----|------|------|
| `key` | string | Yes | Required trailer key |
| `message` | string | No | Error message |

**allowed entry**

| Field | Type | Required | Description |
|-----------|-----|------|------|
| `key` | string | Yes | Allowed trailer key |

**Shared**

| Field | Type | Default | Description |
|-----------|-----|-----------|------|
| `severity` | `"error"` \| `"warn"` | `"error"` | Severity |

### Algorithm

1. `forbidden` — violates when the key matches and, if `value_pattern` is set, the value contains a match
2. `required` — violates when no commit in the range has the key
3. `allowed` — a match on `forbidden` is bypassed when the same entry also matches `allowed`

Trailer keys are normalized case-insensitively (`co-authored-by` ≡ `Co-Authored-By`).

### Example output

```
ERROR [commit.trailers] d4e5f6g
  trailer "Co-authored-by: Claude <noreply@anthropic.com>" is forbidden by policy
  AI Co-authored-by is forbidden by organization policy
```

---

## 3. commit.references

<!-- monban:ref ../src/rules/git/commit-references.ts sha256:39f2948631dc43091614567325a2fa9a8cef43820281972690ce65456d99e898 -->

Require an issue / ticket number reference. Like `commit.message`, fetches commit bodies and checks them by regex.

### Configuration

```yaml
git:
  commit:
    references:
      required: true

      # OR over multiple patterns
      patterns:
        - "#\\d+"        # GitHub Issue
        - "PROJ-\\d+"   # Jira
        - "GH-\\d+"

      # all: required on every commit / any: at least one in the range is enough
      scope: any

      # Exempt: skip dependency updates and reverts
      ignore_patterns:
        - "^chore\\(deps\\):"
        - "^Revert "
      ignore_merges: true

      severity: error
```

### Fields

| Field | Type | Default | Description |
|-----------|-----|-----------|------|
| `required` | boolean | `false` | Enable the rule |
| `patterns` | string[] | — | Regex list for recognizing references (OR semantics) |
| `scope` | `"all"` \| `"any"` | `"any"` | `all`: every commit must have it. `any`: at least one in the range |
| `ignore_patterns` | string[] | `[]` | Skip commits whose subject matches one of these |
| `ignore_merges` | boolean | `true` | Skip merge commits |
| `severity` | `"error"` \| `"warn"` | `"error"` | Severity |

Whether the referenced issue actually exists is not checked (no GitHub API calls).

### Example output

```
ERROR [commit.references]
  no commit in range contains a reference matching ["#\d+", "PROJ-\d+"]
```

---

## 4. diff.size

<!-- monban:ref ../src/rules/git/diff-size.ts sha256:483bf962ea6c4f00043dd5198252e7c4c77ce92543a03d0f3b80a664a0aeacab -->

Checks whether the PR change is too large. Uses `git diff --numstat <base>...<head>` to read per-file insertion/deletion counts.

### Configuration

```yaml
git:
  diff:
    size:
      max_files: 30
      max_insertions: 1000
      max_deletions: 500
      max_total_lines: 1500    # insertions + deletions

      # Exclude lockfiles and generated files from the count
      exclude:
        - "**/*.lock"
        - "package-lock.json"
        - "yarn.lock"
        - "pnpm-lock.yaml"
        - "go.sum"
        - "**/testdata/**"
        - "**/__snapshots__/**"

      severity: warn
```

### Fields

| Field | Type | Default | Description |
|-----------|-----|-----------|------|
| `max_files` | number | — | Max number of changed files |
| `max_insertions` | number | — | Max inserted lines |
| `max_deletions` | number | — | Max deleted lines |
| `max_total_lines` | number | `1500` | Max sum of insertions and deletions |
| `exclude` | string[] | `[]` | Glob patterns to exclude from the count |
| `severity` | `"error"` \| `"warn"` | `"warn"` | Severity (defaults to warn) |

Binary files (shown as `-` by `git diff --numstat`) are excluded from the line count.

### Example output

```
WARN [diff.size]
  total insertions 1824 exceeds max 1000
  total lines (insertions + deletions) 2104 exceeds max 1500
```

---

## 5. diff.ignored

<!-- monban:ref ../src/rules/git/diff-ignored.ts sha256:bbf263438dc1a5df6a6eef6d458be14340bfb8a6bc6888b364dbeb8ec1d32cf6 -->

Detects files tracked despite matching a `.gitignore` pattern. Targets the accident where an agent adds files via `git add -f` or `git add -A`.

Uses `git ls-files --cached --ignored --exclude-standard` (a standard Git command; works with shallow clones).

### Configuration

```yaml
git:
  diff:
    ignored:
      # diff: newly added files within the diff scope only (default)
      # all: the whole repository
      scope: diff

      # Exemptions for files intentionally tracked despite .gitignore
      allowed:
        - ".vscode/settings.json"

      message: "Matches .gitignore but is tracked. Intentional?"
      severity: warn
```

### Fields

| Field | Type | Default | Description |
|-----------|-----|-----------|------|
| `scope` | `"diff"` \| `"all"` | `"diff"` | `diff`: inspect only newly added files in the diff scope. `all`: inspect the whole repo |
| `allowed` | string[] | `[]` | Glob patterns allowed as exemptions |
| `message` | string | — | Output message |
| `severity` | `"error"` \| `"warn"` | `"warn"` | Severity |

`scope: diff` is the default so that introducing this rule to an existing repo doesn't flood findings with pre-existing violations.

### Example output

```
WARN [diff.ignored]
  .env.local: matches .gitignore but is tracked
  .vscode/launch.json: matches .gitignore but is tracked
```

---

## 6. branch_name

<!-- monban:ref ../src/rules/git/branch-name.ts sha256:68a261428438f732a850a39cbae107a40c7c1ced3359869fd09d080abe56ca3d -->

Checks whether the currently checked-out branch name matches a regex. Useful for aligning temporary branches that agents create (for example, `claude/foo-bar-XYZ`) with organization conventions.

Does not check when HEAD is detached (e.g., CI PR events).

### Configuration

```yaml
git:
  branch_name:
    pattern: "^(feat|fix|chore|docs|claude)/[a-z0-9-]+$"
    allowed: ["main", "develop", "release"]
    forbidden: ["^wip(/|$)", "^tmp(/|$)"]
    severity: warn
    message: "Use branch names in the form <type>/<kebab-case>."
```

### Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `pattern` | string | No* | — | Regex a branch must match (allowlist-like) |
| `allowed` | string[] | No | `[]` | Names to skip (e.g. `main`, exact match) |
| `forbidden` | string[] | No* | `[]` | Regex list; a match reports a violation |
| `message` | string | No | — | Custom message |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | Severity |

\* At least one of `pattern` / `forbidden` is required. Evaluation order: `allowed` hit → `forbidden` → `pattern`.

### Example output

```
ERROR [branch_name] WIP_branch
  branch "WIP_branch" does not match pattern ^(feat|fix|chore)/[a-z0-9-]+$
```

---

## 7. tag_name

<!-- monban:ref ../src/rules/git/tag-name.ts sha256:b6fe240c57a57c5d8239b3b61e74de5cdd715ca5c00c054acfb6f9553fa3076c -->

Checks whether repository tag names match a regex. Use it to enforce SemVer or the `v` prefix policy.

Reports nothing when the repo has no tags (assumed pre-release).

### Configuration

```yaml
git:
  tag_name:
    pattern: "^v\\d+\\.\\d+\\.\\d+(-[a-z0-9.]+)?$"
    # Exempt pre-existing non-conforming tags
    allowed: ["release-1", "legacy-v2"]
    # Example: forbid tagging beta/rc directly
    forbidden: ["(beta|rc)\\d*$"]
    scope: recent      # all | recent
    limit: 50
    severity: error
    message: "Use SemVer-formatted tags (for example v1.2.3, v1.2.3-rc.1)."
```

### Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `pattern` | string | No* | — | Regex a tag must match (allowlist-like) |
| `allowed` | string[] | No | `[]` | Tag names to skip (exact match) |
| `forbidden` | string[] | No* | `[]` | Regex list; a match reports a violation |
| `scope` | `"all"` \| `"recent"` | No | `"all"` | `recent` inspects only the `limit` most recent tags by creatordate |
| `limit` | integer | No | `100` | Number of tags to inspect when `scope: recent` |
| `message` | string | No | — | Custom message |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | Severity |

\* At least one of `pattern` / `forbidden` is required. Evaluation order: `allowed` hit → `forbidden` → `pattern`.

### Example output

```
ERROR [tag_name] release-2
  tag "release-2" does not match pattern ^v\d+\.\d+\.\d+$
```

### Handling pre-existing tags

When rolling out a SemVer convention, `scope: recent` lets you exclude legacy non-conforming tags and ramp up gradually. `scope: all` is for new projects or repos that are already cleaned up.

---

## Common output

```
$ monban git --diff=main

[commit.message] 2 errors
  a1b2c3d: subject exceeds 72 chars (76)
    "feat(auth): add OAuth2 integration with Google, GitHub, and Microsoft providers"
  d4e5f6g: subject is a forbidden keyword: "fix"

[commit.trailers] 1 error
  d4e5f6g: trailer "Co-authored-by: Claude <noreply@anthropic.com>" is forbidden by policy

[diff.size] 1 warning
  total insertions 1824 exceeds max 1000

[diff.ignored] 1 warning
  .env.local: matches .gitignore but is tracked

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  3 errors, 2 warnings. Blocking merge.
```

---

## Relationship to existing tools

| Tool | Scope |
|--------|------|
| commitlint / gitlint | Specialized for commit messages. Requires a Node / Python runtime |
| pre-commit framework | General hooks. Each hook usually pulls its own runtime |
| check-added-large-files | File size only |
| gitleaks | Specialized for secret detection |
| **monban git** | **Agent-specific issues (message quality, massive PRs, ignore bypasses) in a language-agnostic single config** |

monban does not aim to be a complete replacement; it is meant to be used alongside the tools above.
