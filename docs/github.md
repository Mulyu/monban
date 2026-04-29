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

<!-- monban:ref ../src/rules/github/required.ts sha256:3ef31502e6cc0fbc44561c3f91260542c0fbe0e45c7200d17397f1b46c2a9713 -->

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

<!-- monban:ref ../src/rules/github/forbidden.ts sha256:d81e1d81398871834a330895cc9487bbd6e0efd3d5d1517c20d867f1795e19fd -->

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

<!-- monban:ref ../src/rules/github/pinned.ts sha256:f0f9d069ddf10641ddd17e221029b2065f2679b2168182a30728b5fdba985236 -->

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

<!-- monban:ref ../src/rules/github/permissions.ts sha256:2fa692234029ec4545792a554aff4734f6c7b6c91263be211e993331ae847259 -->

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

<!-- monban:ref ../src/rules/github/triggers.ts sha256:9bfa8aa8a37dd99d570a59fba964eb7db6bfd9b80952a904405cb451198460fc -->

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

<!-- monban:ref ../src/rules/github/runner.ts sha256:4e4efee1d9d080f4427b8a71cebe7715182696952ebcdd9ed6b3726632ebdca5 -->

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

<!-- monban:ref ../src/rules/github/timeout.ts sha256:345304dc27cb52eacd5fee8b68a7a107af9087a91edbf7628ad1c0e41208a56c -->

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

<!-- monban:ref ../src/rules/github/concurrency.ts sha256:7017de12c26e1d75aa72f6e3a170947d88d9e0164160b0c03696c1c174823e0a -->

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

<!-- monban:ref ../src/rules/github/consistency.ts sha256:2fb885f0110c24332501b16a17387959a6575ad8c6963653f083c9d6839c8d1f -->

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

<!-- monban:ref ../src/rules/github/secrets.ts sha256:51fb4aa8ae585098eb73c496113b61bb9cccb83ca69a88fcad253dbef81c07e9 -->

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

<!-- monban:ref ../src/rules/github/danger.ts sha256:e530c6fbf72210aa8036fb7f0fd341b9c9215e48940d319fec3aadffc6bc6db1 -->

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

<!-- monban:ref ../src/rules/github/injection.ts sha256:c6da9a5f3644fb6040196ac8d754abbfcfa3810eb8bbcfcdff82105795b06148 -->

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

<!-- monban:ref ../src/rules/github/codeowners.ts sha256:eec767568805cb1ef0c2b061b67751790bb5044a7a8ac89989be6de3a427c649 -->

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
