# monban github

> [日本語](./github.ja.md) | **English**

Structural checks on GitHub-specific files (workflows, CODEOWNERS). Specialized for YAML parsing and the CODEOWNERS custom syntax.

- `github.actions.*` — parses `.github/workflows/**/*.yml` as YAML
- `github.codeowners.*` — parses `.github/CODEOWNERS` / `CODEOWNERS` / `docs/CODEOWNERS` with its own syntax
- Selector is `path` (a glob pattern)

```bash
monban github                              # run every rule
monban github --rule actions.pinned        # run a specific rule only
monban github --rule codeowners.ownership
monban github --diff=main                  # scope to a diff (details: ./diff.md)
monban github --json                       # JSON output
```

Rule names are dot-separated (`<target-file-group>.<rule>`). Each rule takes an explicit `path` field; there is no implicit file pinning.

GitHub-related checks that do not need structural parsing (existence of `LICENSE` / `SECURITY.md`, PR template's required sections, "forbid `continue-on-error: true`" and so on) are expressed with `path.required` / `content.required` / `content.forbidden`, not with `github`.

---

## Rule list

| # | Rule | Target | Summary |
|---|--------|------|------|
| 1 | `actions.required` | workflows | Required workflows and required steps |
| 2 | `actions.forbidden` | workflows | Forbidden actions (`uses` accepts a string or array) |
| 3 | `actions.pinned` | workflows | Pinning of `uses` for actions, reusable workflows, and Docker images |
| 4 | `actions.permissions` | workflows | `permissions:` declaration required / forbidden scalar values |
| 5 | `actions.triggers` | workflows | `on:` event allow / deny |
| 6 | `actions.runner` | workflows | `runs-on:` allowlist |
| 7 | `actions.timeout` | workflows | `timeout-minutes:` required on every job, with a cap |
| 8 | `actions.concurrency` | workflows | `concurrency:` declaration required |
| 9 | `actions.consistency` | workflows | Version consistency across uses of the same action |
| 10 | `actions.secrets` | workflows | Allowlist on `${{ secrets.X }}` references |
| 11 | `actions.danger` | workflows | Detect the dangerous combination of `pull_request_target` + `actions/checkout`, and missing `persist-credentials` |
| 12 | `actions.injection` | workflows | Detect script injection via untrusted `${{ github.event.* }}` input embedded directly in a `run:` step |
| 13 | `codeowners.ownership` | CODEOWNERS | One-directional `path → owners` consistency |

---

## Configuration

```yaml
# monban.yml
github:
  actions:
    required:
      - file: ".github/workflows/test.yml"
      - path: ".github/workflows/test.yml"
        steps: ["actions/checkout", "actions/setup-node"]

    forbidden:
      - path: ".github/workflows/**/*.yml"
        uses: ["actions/create-release", "actions/upload-release-asset"]
        message: "Use release-please."

    pinned:
      - path: ".github/workflows/**/*.yml"
        targets: ["action", "reusable", "docker"]

    permissions:
      - path: ".github/workflows/**/*.yml"
        required: true
        forbidden: ["write-all"]

    triggers:
      - path: ".github/workflows/**/*.yml"
        allowed: ["push", "pull_request", "workflow_dispatch"]
        forbidden: ["pull_request_target"]

    runner:
      - path: ".github/workflows/**/*.yml"
        allowed: ["ubuntu-latest", "ubuntu-22.04"]
        forbidden: ["self-hosted"]

    timeout:
      - path: ".github/workflows/**/*.yml"
        max: 30

    concurrency:
      - path: ".github/workflows/**/*.yml"

    consistency:
      - path: ".github/workflows/**/*.yml"
        actions: ["actions/checkout", "actions/setup-node"]

    secrets:
      - path: ".github/workflows/**/*.yml"
        allowed: ["NPM_TOKEN", "GITHUB_TOKEN", "SLACK_WEBHOOK"]
        forbidden: ["LEGACY_DEPLOY_KEY"]

  codeowners:
    ownership:
      - path: "src/payments/**"
        owners: ["@myorg/payments-team"]
        message: "payments/ must be reviewed by the payments-team"
```

`github.actions` and `github.codeowners` are each objects holding rule arrays. Every rule takes a required `path` explicitly specifying the target glob.

---

## 1. actions.required

<!-- monban:ref ../src/rules/github/required.ts sha256:e84175e0722a5bd64b98b5ca93322784775e76d3a5fe8c14519ff076f09f8392 -->

Verifies that required workflow files exist and that required steps appear inside them.

### Configuration

```yaml
github:
  actions:
    required:
      - file: ".github/workflows/test.yml"        # existence check
      - path: ".github/workflows/test.yml"        # step existence check
        steps: ["actions/checkout", "actions/setup-node"]
```

### Fields

| Field | Type | Required | Description |
|-----------|-----|------|------|
| `file` | string | No* | Path to a required workflow file |
| `path` | string | No* | Path to a target workflow file |
| `steps` | string[] | No | Required steps (prefix match on `uses`) |

\* One of `file`, or `path` + `steps`, is required.

### Example output

```
ERROR [actions.required] .github/workflows/lint.yml
  required workflow not found.
```

---

## 2. actions.forbidden

<!-- monban:ref ../src/rules/github/forbidden.ts sha256:ad3986f7424ff4b7ec7c2b005cede36d0e67492c2f67ee53cbf89b288cf2fa1b -->

Detects forbidden actions.

### Configuration

```yaml
github:
  actions:
    forbidden:
      - path: ".github/workflows/**/*.yml"
        uses: "actions/create-release"
        message: "Use release-please."
        severity: warn
      # Multiple forbidden items can be bundled as an array
      - path: ".github/workflows/**/*.yml"
        uses:
          - "actions/create-release"
          - "actions/upload-release-asset"
```

### Fields

| Field | Type | Required | Default | Description |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | Target glob |
| `uses` | string \| string[] | Yes | — | Forbidden actions (prefix match). Array for multiple |
| `message` | string | No | — | Error message |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | Severity |

---

## 3. actions.pinned

<!-- monban:ref ../src/rules/github/pinned.ts sha256:eaf20c76b603608d419c319d89f984cb38c5bb468ac0e205fb12053b810da3f4 -->

Verifies that the reference in a `uses` field is pinned to a commit hash.

Tags (`@v4`, `@main`, etc.) are mutable and expose supply-chain attack risk.

### Configuration

```yaml
github:
  actions:
    pinned:
      - path: ".github/workflows/**/*.yml"
        targets: ["action", "reusable", "docker"]
```

### Fields

| Field | Type | Required | Default | Description |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | Target workflow glob |
| `targets` | string[] | No | `["action"]` | Reference kinds to check for pinning |

Valid `targets` values:

| Value | Target | Check |
|----|------|------|
| `action` | Action in a step's `uses:` (e.g. `actions/checkout@...`) | 40-digit hex |
| `reusable` | Reusable workflow at the job's `uses:` (e.g. `owner/repo/.github/workflows/x.yml@...`) | 40-digit hex |
| `docker` | `uses: docker://...` in a step | 64-digit hex prefixed with `@sha256:` |

Local references (starting with `./`) are skipped.

### Example output

```
ERROR [actions.pinned] .github/workflows/test.yml
  not hash-pinned: actions/checkout@v4
```

---

## 4. actions.permissions

<!-- monban:ref ../src/rules/github/permissions.ts sha256:c6f7c1009458415afc935cc9ad23fbda4439272dc5e27d5111286f0d51c7bf98 -->

Validates the workflow's `permissions:` declaration. Without a `permissions:` declaration, GitHub grants the `GITHUB_TOKEN` broad permissions by default, so explicit declaration is recommended.

### Configuration

```yaml
github:
  actions:
    permissions:
      - path: ".github/workflows/**/*.yml"
        required: true              # declaration required (default true)
        forbidden: ["write-all"]    # forbidden scalar values
```

### Fields

| Field | Type | Required | Default | Description |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | Target glob |
| `required` | boolean | No | `true` | Whether a `permissions:` declaration is required |
| `forbidden` | string[] | No | `[]` | Forbidden scalar values (`write-all` / `read-all`, etc.) |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | Severity |

### Algorithm

1. When `required: true`, confirm that the workflow-level `permissions:` key exists
2. If the workflow-level or any job's `permissions:` is a scalar value listed in `forbidden`, report

### Example output

```
ERROR [actions.permissions] .github/workflows/release.yml
  permissions: is not declared.
ERROR [actions.permissions] .github/workflows/ci.yml
  forbidden permissions scalar: write-all
```

---

## 5. actions.triggers

<!-- monban:ref ../src/rules/github/triggers.ts sha256:d0f5176a003213e685b2d275a1982ed622f232f7e18df467c2512dd2c81bef13 -->

Validates the workflow's `on:` events.

Use it to catch dangerous triggers like `pull_request_target`, or to require a manual trigger (`workflow_dispatch`).

### Configuration

```yaml
github:
  actions:
    triggers:
      - path: ".github/workflows/**/*.yml"
        allowed: ["push", "pull_request", "workflow_dispatch"]
        forbidden: ["pull_request_target"]
```

### Fields

| Field | Type | Required | Default | Description |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | Target glob |
| `allowed` | string[] | No | `[]` | Allowed events (when set, functions as an allowlist) |
| `forbidden` | string[] | No | `[]` | Forbidden events |

`on:` supports scalar / array / map forms.

### Algorithm

1. Extract event names from `on:` (e.g. `on: push` → `["push"]`, `on: [push, pull_request]` → `["push", "pull_request"]`, `on: { push: {...} }` → `["push"]`)
2. When `allowed` is set, report any event not in the set
3. When `forbidden` is set, report if any listed event appears

---

## 6. actions.runner

<!-- monban:ref ../src/rules/github/runner.ts sha256:13562bec933527288259b91e87e36c9d11aa7f7b5e17242ca086ab4d684e25b7 -->

Validates each job's `runs-on:` against an allowlist.

Use it to restrict specific runners (`self-hosted`, `macos-*`) for cost or security reasons.

### Configuration

```yaml
github:
  actions:
    runner:
      # allowlist only (anything other than ubuntu-latest violates)
      - path: ".github/workflows/**/*.yml"
        allowed: ["ubuntu-latest", "ubuntu-22.04"]

      # denylist only (forbid self-hosted; everything else is fine)
      - path: ".github/workflows/**/*.yml"
        forbidden: ["self-hosted"]
```

### Fields

| Field | Type | Required | Description |
|-----------|-----|------|------|
| `path` | string | Yes | Target glob |
| `allowed` | string[] | No* | Allowed runner labels |
| `forbidden` | string[] | No* | Forbidden runner labels |

\* At least one of `allowed` / `forbidden` is required. If both are set, `forbidden` is evaluated first.

### Algorithm

1. Extract each job's `runs-on:` (string or array)
2. Skip expressions containing `${{ ... }}` (not statically evaluable)
3. Report if any label matches `forbidden`
4. When `allowed` is set, report any label not in the set

---

## 7. actions.timeout

<!-- monban:ref ../src/rules/github/timeout.ts sha256:294277ec278146163b77393e4c9dd200427f32326487ea9219b3502b120a92d7 -->

Verifies that every job has `timeout-minutes:` set and stays under the cap.

### Configuration

```yaml
github:
  actions:
    timeout:
      - path: ".github/workflows/**/*.yml"
        max: 30
```

### Fields

| Field | Type | Required | Default | Description |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | Target glob |
| `max` | number | Yes | — | Allowed maximum minutes |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | Severity |

### Algorithm

1. Check each job's `timeout-minutes:`
2. Report if not set
3. Report if the value exceeds `max`

Reusable workflow calls (job-level `uses:`) cannot control timeout from within the calling job, so they are skipped.

---

## 8. actions.concurrency

<!-- monban:ref ../src/rules/github/concurrency.ts sha256:e616de7a9097803fc67b8dfe1b8e1a20085652a17d9d5dd4fdbf829feeee764a -->

Require a workflow-level `concurrency:` declaration.

Without `concurrency`, successive pushes to the same PR trigger redundant builds, wasting cost and runner slots.

### Configuration

```yaml
github:
  actions:
    concurrency:
      - path: ".github/workflows/**/*.yml"
```

### Fields

| Field | Type | Required | Default | Description |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | Target glob |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | Severity |

### Algorithm

1. Check for the workflow-level `concurrency:` key
2. Report if absent

---

## 9. actions.consistency

<!-- monban:ref ../src/rules/github/consistency.ts sha256:ba0ff206fbe16fdd4d95ae884241e3134097eae058067c0ee6d0327b524bf159 -->

Verifies that the same action uses the same version (`ref`) across multiple files.

Mixing `actions/checkout@v4` with `actions/checkout@v3` is a recipe for leaving one behind during upgrades.

### Configuration

```yaml
github:
  actions:
    consistency:
      - path: ".github/workflows/**/*.yml"
        actions: ["actions/checkout", "actions/setup-node"]
```

### Fields

| Field | Type | Required | Description |
|-----------|-----|------|------|
| `path` | string | Yes | Target glob |
| `actions` | string[] | Yes | Actions to check for consistency (`owner/repo` form) |

### Algorithm

1. Tally the `ref` values (after `@`) for each specified action across the target file set
2. If an action is found with multiple refs, report on every affected file

### Example output

```
ERROR [actions.consistency] .github/workflows/test.yml
  inconsistent version for actions/checkout: @v3, @v4
```

---

## 10. actions.secrets

<!-- monban:ref ../src/rules/github/secrets.ts sha256:6432b58f7a015752f3be2e3fdf7641c7ec7e08b66097e8c4463e7d1b09f24381 -->

Verifies that `${{ secrets.X }}` references in a workflow match an allowlist.

Catches typos and references to undefined secrets statically.

### Configuration

```yaml
github:
  actions:
    secrets:
      # allowlist only (unknown names are treated as typos)
      - path: ".github/workflows/**/*.yml"
        allowed: ["NPM_TOKEN", "GITHUB_TOKEN", "SLACK_WEBHOOK"]

      # denylist only (prevent reuse of retired secrets)
      - path: ".github/workflows/**/*.yml"
        forbidden: ["LEGACY_DEPLOY_KEY"]
```

### Fields

| Field | Type | Required | Description |
|-----------|-----|------|------|
| `path` | string | Yes | Target glob |
| `allowed` | string[] | No* | Allowed secret names |
| `forbidden` | string[] | No* | Forbidden secret names |

\* At least one of `allowed` / `forbidden` is required. If both are set, `forbidden` is evaluated first.

### Algorithm

1. Extract `${{ secrets.NAME }}` references from the file body (via regex)
2. Report any name in `forbidden`
3. When `allowed` is set, report any name not in the set
4. `secrets.GITHUB_TOKEN` and `secrets.github_token` are treated as equivalent (GitHub is case-insensitive here)

---

## 11. actions.danger

<!-- monban:ref ../src/rules/github/danger.ts sha256:640f2ab7153471dee27c30e1f4adc2c75399f01e5560796159e435348674febb -->

Detects **dangerous boilerplate patterns** in workflows. Covers two items from the Actions hardening guidance issued by GitHub / OpenSSF after tj-actions/changed-files (CVE-2025-30066):

1. `pull_request_target` + `actions/checkout` — the classic path for exfiltrating secrets from fork PRs
2. `actions/checkout` without `persist-credentials: false` — the `GITHUB_TOKEN` is left in `.git/config` by default, readable by subsequent steps

### Configuration

```yaml
github:
  actions:
    danger:
      - path: ".github/workflows/**/*.yml"
        severity: error
```

### Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `path` | string | Yes | — | Target workflow glob |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | Severity |

### Example output

```
ERROR [actions.danger] .github/workflows/release.yml:publish
  Set persist-credentials: false on actions/checkout (token is left behind by default).

ERROR [actions.danger] .github/workflows/pr.yml:build
  pull_request_target + actions/checkout is dangerous (path for secret exfiltration from fork PRs).
```

---

## 12. actions.injection

<!-- monban:ref ../src/rules/github/injection.ts sha256:e49491b30e1b08a0a80636df342274a02581d0b9885ada40b4a28ce7746c2989 -->

Detects whether **untrusted input** such as `${{ github.event.*.body }}` is embedded directly in a `run:` step. Catches the script-injection attack that GitHub's security hardening guide explicitly calls out as "the most exploited path".

### Detection targets

Detected when any of the following contexts is expanded via `${{ ... }}` inside a `run:`:

- `github.event.issue.title` / `.body`
- `github.event.pull_request.title` / `.body` / `.head.ref` / `.head.label`
- `github.event.comment.body`
- `github.event.review.body` / `review_comment.body`
- `github.event.discussion.title` / `.body`
- `github.event.commits.*.message` / `.author.email` / `.author.name`
- `github.head_ref`

The safe pattern is to pass the value through `env:` (even for vulnerable contexts, the `env:` value expands as a shell variable safely).

### Configuration

```yaml
github:
  actions:
    injection:
      - path: ".github/workflows/**/*.yml"
        severity: error
        # Exception: allow a specific, pre-sanitized run: step
        allowed_contexts:
          - "github.event.issue.number"  # number cannot lead to injection
```

### Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `path` | string | Yes | — | Target workflow glob |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | Severity |
| `allowed_contexts` | string[] | No | `[]` | Context expressions to skip (exact match) |

### Example output

```
ERROR [actions.injection] .github/workflows/welcome.yml:greet
  Untrusted input github.event.issue.title used inside a run: step (script-injection path). Pass it through env: instead.
```

### Fix pattern

```yaml
# Dangerous
- run: echo "Title: ${{ github.event.issue.title }}"

# Safe
- env:
    ISSUE_TITLE: ${{ github.event.issue.title }}
  run: echo "Title: $ISSUE_TITLE"
```

---

## 13. codeowners.ownership

<!-- monban:ref ../src/rules/github/codeowners.ts sha256:d3e013ad8c11106fa01c6301095a22203f3c9e7100478ad794f3061d7c80f0f9 -->

Verifies the one-directional `path → owners` integrity of `CODEOWNERS`.

Only checks "files matching this glob must have these owners". The reverse direction ("what should this owner own") is not checked.

### Configuration

```yaml
github:
  codeowners:
    ownership:
      - path: "src/payments/**"
        owners: ["@myorg/payments-team"]
        message: "payments/ must be reviewed by the payments-team"
```

### Fields

| Field | Type | Required | Description |
|-----------|-----|------|------|
| `path` | string | Yes | Target file glob |
| `owners` | string[] | Yes | Required owners (`@user` / `@org/team`) |
| `message` | string | No | Error message |

### Algorithm

1. Read one of `.github/CODEOWNERS` / `CODEOWNERS` / `docs/CODEOWNERS`
2. Enumerate files matching the rule's `path` via glob
3. For each file, take the **last matching line** in CODEOWNERS (matching GitHub's behavior)
4. Report if that match does not include every listed owner

---

## Common output

```
$ monban github

monban github — GitHub checks

  ✗ actions.pinned         2 violations
  ✓ actions.required
  ✗ actions.permissions    1 violation
  ✓ actions.triggers
  ...
  ✓ codeowners.ownership

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  3 violations (3 errors)
  9/11 rules passed
```
