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

<!-- monban:ref ../src/rules/github/required.ts sha256:631e40e216b9bd61a91035a733ddb537054f111035eb839e0498b7edb6976381 -->

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

<!-- monban:ref ../src/rules/github/forbidden.ts sha256:fa375090045dd0a2beee0ed64fa0d38518c3fb1792302a27c1c6bf898e3fb5fc -->

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

<!-- monban:ref ../src/rules/github/pinned.ts sha256:dc1cdd41548bd4f2a02e40bf5c6fc7af9c5b3ef209ecc9a7edf44b7f09c87107 -->

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

<!-- monban:ref ../src/rules/github/permissions.ts sha256:d4350f0d58c58766c5db85098dd8ec0f0006e196c617b2581e74aa0274a19782 -->

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

<!-- monban:ref ../src/rules/github/triggers.ts sha256:c051a3a2cbff2a896ec78b60d75ff3a00bb52ac2a84aeba9b46c1cf7909b55e7 -->

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

<!-- monban:ref ../src/rules/github/runner.ts sha256:e84e509a9337dce00d008f870390dbff8226461ddb97c0f574313676535b8257 -->

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

<!-- monban:ref ../src/rules/github/timeout.ts sha256:fc544c469d4349ca795729bf612813c6939de7e068dd540e34cbe271495aa9b0 -->

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

<!-- monban:ref ../src/rules/github/concurrency.ts sha256:f30846649492afa1846d09a92418ebf3a48a47540203311b02968dad2f9c73aa -->

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

<!-- monban:ref ../src/rules/github/consistency.ts sha256:c197759d77b25c4a2c53e498c923cf37f62defb96eaf8a63209cca343e1ae0fa -->

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

<!-- monban:ref ../src/rules/github/secrets.ts sha256:42ac2a154269dc4f793414b0fb5deb10d2ad2b142bd7e34e4868b930322920a0 -->

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

<!-- monban:ref ../src/rules/github/danger.ts sha256:f23f648a5ad828a05c1c2501e9f490554e27cf4de119383fb27b65dfc2e52da8 -->

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

<!-- monban:ref ../src/rules/github/injection.ts sha256:062f5e3583a43c185c7a05a778e0c3e5427567c44b53ec362d6724fc054ae842 -->

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

<!-- monban:ref ../src/rules/github/codeowners.ts sha256:b5dd8a330b85a6a9a3205a68a5aa9ac08aeef9fe43b492b847d3297bedcea516 -->

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
