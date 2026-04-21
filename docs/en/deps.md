# monban deps

> [日本語](../deps.md) | **English**

Dependency-package checks. Extracts dependency names from manifests and validates existence, freshness, popularity, and similarity against package registries.

- Language-agnostic, no AST
- Structural parsing of manifests (`package.json` / `requirements.txt` / `go.mod` / `Gemfile` / `Cargo.toml` / `.github/workflows/*.yml`, etc.) + external registry API lookups
- Selector is `path` (a glob). The ecosystem is auto-detected from the filename
- Multiple registries are handled through a single endpoint: the [ecosyste.ms](https://ecosyste.ms/) packages names API

```bash
monban deps                    # run every rule
monban deps --rule existence   # run a specific rule only
monban deps --offline          # skip external API calls; run only allowed / forbidden
monban deps --json             # JSON output
```

> `monban deps` is the only command in monban that reaches out to the network. In air-gapped environments, pass `--offline`.

---

## Rule list

| # | Rule | Summary |
|---|--------|------|
| 1 | `allowed` | allowlist (only listed names are permitted) |
| 2 | `forbidden` | denylist (listed names are rejected) |
| 3 | `existence` | Detect dependency names that do not exist in the registry (hallucination / slopsquat mitigation) |
| 4 | `cross_ecosystem` | Detect requests for names that only exist in a different ecosystem |
| 5 | `typosquat` | Detect names close in edit distance to popular packages |
| 6 | `freshness` | Detect newly published packages within a threshold |
| 7 | `popularity` | Detect packages whose weekly download count is below a threshold |
| 8 | `install_scripts` | Detect declarations of npm lifecycle hooks (preinstall / install / postinstall / prepare) |
| 9 | `git_dependency` | Detect dependencies from non-registry sources (`git+` / `file:` / direct URL) |
| 10 | `floating_version` | Detect floating version ranges (`^` / `~` / `*` / `latest` / unbounded `>=`) |

---

## Supported manifests

| Ecosystem | File | Extracted from |
|---|---|---|
| npm | `package.json` | Keys under `dependencies` / `devDependencies` / `peerDependencies` / `optionalDependencies` |
| PyPI | `requirements.txt` / `pyproject.toml` | Leading tokens in requirements lines / `[project.dependencies]` / `[tool.poetry.dependencies]` |
| Go modules | `go.mod` | Module paths under the `require` block |
| RubyGems | `Gemfile` | `gem "NAME"` / `gem 'NAME'` |
| Cargo | `Cargo.toml` | Keys under `[dependencies]` / `[dev-dependencies]` / `[build-dependencies]` |
| GitHub Actions | `.github/workflows/**/*.yml` | The portion before `@` in each step's `uses:` (local references `./` are excluded) |

Lockfile analysis is out of scope (owned by Dependabot / Renovate). monban is responsible for **dependency names written explicitly by humans or agents**.

---

## Configuration

Every rule automatically excludes patterns listed in the top-level `exclude`.

```yaml
# monban.yml
exclude:
  - "**/node_modules/**"
  - "**/vendor/**"

deps:
  allowed:
    - path: "package.json"
      names:
        - "@myorg/*"
        - my-internal-package

  forbidden:
    - path: "package.json"
      names:
        - event-stream
        - flatmap-stream
      message: "Previously compromised package."

  existence:
    - path: "package.json"
    - path: "pyproject.toml"
    - path: ".github/workflows/**/*.yml"

  cross_ecosystem:
    - path: "package.json"
      severity: warn

  typosquat:
    - path: "package.json"
      max_distance: 2
      severity: warn

  freshness:
    - path: "package.json"
      max_age_hours: 24
      severity: warn

  popularity:
    - path: "package.json"
      min_downloads: 100
      severity: warn

  install_scripts:
    - path: "**/package.json"
      severity: warn
      message: "npm lifecycle hooks are a primary supply-chain attack vector. Review legitimacy in PR."
      # Default forbidden list is [preinstall, install, postinstall, prepare]

  git_dependency:
    - path: "**/package.json"
      severity: warn

  floating_version:
    - path: "**/package.json"
      severity: warn
```

---

## 1. allowed

<!-- monban:ref ../../src/rules/deps/allowed.ts sha256:eb03f7384054b249e24e1996de525ca051ba38f5240f30ce807930149bb7eed1 -->

An allowlist. Only the listed names are permitted; everything else violates. Used for an organization's approved-package workflow.

### Configuration

```yaml
deps:
  allowed:
    - path: "package.json"
      names:
        - "@myorg/*"       # glob allowed
        - express
        - react
        - react-dom
```

### Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `path` | string | Yes | — | Glob of the target manifest |
| `names` | string[] | Yes | — | Allowed package names (glob supported) |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | Severity |

### Example output

```
ERROR [allowed] package.json:6 some-random-lib
  not in the allowlist.
```

---

## 2. forbidden

<!-- monban:ref ../../src/rules/deps/forbidden.ts sha256:128f2581f53d375c65c4723608cc15efb437dc9b72f23146b3e00b4e414df841 -->

A denylist. Forbids the listed names. Use it for previously compromised packages or internally replaced dependencies.

### Configuration

```yaml
deps:
  forbidden:
    - path: "package.json"
      names:
        - event-stream
        - flatmap-stream
      message: "Previously compromised package."
```

### Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `path` | string | Yes | — | Glob of the target manifest |
| `names` | string[] | Yes | — | Forbidden package names (glob supported) |
| `message` | string | No | — | Error message |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | Severity |

### Example output

```
ERROR [forbidden] package.json:9 event-stream
  Previously compromised package.
```

---

## 3. existence

<!-- monban:ref ../../src/rules/deps/existence.ts sha256:f5fa699c97824c08b3d5109772ffbde73d6d33bd254b8ea73345df87db5165c2 -->

Verifies that a dependency name actually exists in the registry. The core rule of `monban deps`.

AI agents confidently propose nonexistent dependency names (research reports that 5–21% of LLM-generated code contains nonexistent packages). That's not just a typo — it's the entry point for a new attack vector, **slopsquatting**.

### Configuration

```yaml
deps:
  existence:
    - path: "package.json"
    - path: "requirements.txt"
    - path: ".github/workflows/**/*.yml"
```

### Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `path` | string | Yes | — | Glob of the target manifest |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | Severity |
| `exclude` | string[] | No | — | Package names excluded from the check (private-registry internal packages, etc.) |

### Algorithm

1. Structurally parse the manifest and extract dependency names
2. Determine the ecosystem from the file type
3. Look up each name against the ecosyste.ms packages names API; if it's not found, report
4. When the network is unreachable, use the cache if present; otherwise skip (same behavior as `--offline`) and emit a warning

### Example output

```
ERROR [existence] package.json:3 ai-json-helper
  not found in the npm registry.
  likely a hallucination.
ERROR [existence] package.json:4 reqeusts
  not found in the npm registry.
  PyPI has a similar package with the same name (requests).
```

---

## 4. cross_ecosystem

<!-- monban:ref ../../src/rules/deps/cross-ecosystem.ts sha256:eb58416d4ced683ea70a875262ac149f1d5c497148d4abb2bf610632061379b9 -->

Detects cases like "npm project requesting a name that only exists in PyPI". A classic indicator that an AI agent got the language wrong.

### Configuration

```yaml
deps:
  cross_ecosystem:
    - path: "package.json"
      severity: warn
```

### Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `path` | string | Yes | — | Glob of the target manifest |
| `severity` | `"error"` \| `"warn"` | No | `"warn"` | Severity |

### Example output

```
WARN  [cross_ecosystem] package.json:4 requests
  not found in the npm registry, but a package of the same name exists in PyPI.
  possible ecosystem mix-up.
```

---

## 5. typosquat

<!-- monban:ref ../../src/rules/deps/typosquat.ts sha256:4b87eaf62b02a31e6586ada129a6fba1ff5180671619e874e9b21c347f1bcb65 -->

Warns when a dependency name is close in Levenshtein distance to a popular package.

### Configuration

```yaml
deps:
  typosquat:
    - path: "package.json"
      max_distance: 2
      severity: warn
```

### Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `path` | string | Yes | — | Glob of the target manifest |
| `max_distance` | number | No | `2` | Report when the distance to a popular name is at or below this value |
| `severity` | `"error"` \| `"warn"` | No | `"warn"` | Severity |

### Example output

```
WARN  [typosquat] package.json:7 lodahs
  edit distance 2 from the popular package lodash.
```

---

## 6. freshness

<!-- monban:ref ../../src/rules/deps/freshness.ts sha256:a54b9ce4097cb82e2ab4864d78f0824c4350a541534321686548c91a426d5174 -->

Warns about packages published within a recent window. Brand-new packages are a frequent slopsquat target.

### Configuration

```yaml
deps:
  freshness:
    - path: "package.json"
      max_age_hours: 24
      severity: warn
```

### Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `path` | string | Yes | — | Glob of the target manifest |
| `max_age_hours` | number | No | `24` | Ages below this value violate |
| `severity` | `"error"` \| `"warn"` | No | `"warn"` | Severity |

### Example output

```
WARN  [freshness] package.json:5 brand-new-logger
  published 3 hours ago (below the 24h threshold).
```

---

## 7. popularity

<!-- monban:ref ../../src/rules/deps/popularity.ts sha256:fe78df4f2e795c2d6b1f87ddc2d51a6abe0c2fc8ada12f48eee7201adb21b082 -->

Warns about packages whose weekly download count is below a threshold.

### Configuration

```yaml
deps:
  popularity:
    - path: "package.json"
      min_downloads: 100
      severity: warn
```

### Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `path` | string | Yes | — | Glob of the target manifest |
| `min_downloads` | number | No | `100` | Below this weekly count violates |
| `severity` | `"error"` \| `"warn"` | No | `"warn"` | Severity |

### Example output

```
WARN  [popularity] package.json:5 brand-new-logger
  weekly downloads 2 (below the 100 threshold).
```

---

## 8. install_scripts

<!-- monban:ref ../../src/rules/deps/install-scripts.ts sha256:da05c18867731a27c2a2aa4f6220f368bd514ce295d3ce5a5e1da7422b7a6925 -->

Detects npm lifecycle hooks (`preinstall` / `install` / `postinstall` / `prepare`) declared under `scripts:`. These are an arbitrary-code-execution attack surface — 72% of npm attacks in 2025 exploit this path (Shai-Hulud and others).

There are legitimate uses (monorepo bootstrap, Husky configuration, etc.), so the default severity is `warn`. It's meant to be reviewed case-by-case in PR.

### Configuration

```yaml
deps:
  install_scripts:
    - path: "**/package.json"
      severity: warn
      message: "npm lifecycle hooks are a primary supply-chain attack vector."

    # Only allow `prepare` (useful for locking down to Husky / husky-init)
    - path: "**/package.json"
      forbidden: ["preinstall", "install", "postinstall"]
      severity: error
```

### Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `path` | string | Yes | — | Glob of the target manifest |
| `exclude` | string[] | No | — | Exclude glob |
| `forbidden` | string[] | No | `[preinstall, install, postinstall, prepare]` | Hook names to forbid |
| `message` | string | No | — | Custom message |
| `severity` | `"error"` \| `"warn"` | No | `"warn"` | Severity |

### Example output

```
WARN  [install_scripts] package.json:5
  preinstall lifecycle hook declared (arbitrary-code-execution attack surface).
```

### Supported ecosystems

Currently **npm only** (`scripts.{preinstall,install,postinstall,prepare}` in package.json). PyPI's `[tool.poetry.build]` and Gemfile's `post_install_message` have narrower attack surfaces and are candidates for future extension.

---

## 9. git_dependency

<!-- monban:ref ../../src/rules/deps/git-dependency.ts sha256:4aaff8d91c252f35bbd6a830111976dc2ddef6e13303e3b4f750d31551125401 -->

Detects dependencies fetched from non-registry sources (git URL, local path, direct HTTP tarball). Classic pattern for `slopsquat` / PhantomRaven (Remote Dynamic Dependencies); not subject to registry auditing, hence watched.

### Detection targets

| Pattern | Example |
|---------|-----|
| `git+` / `git:` / `git@` / `ssh://` | `git+https://github.com/evil/x.git` |
| `file:` / `./` / `../` / `/` | `file:../local-lib` |
| `github:` / `gitlab:` / `bitbucket:` shorthand | `github:evil/x` |
| `http://` / `https://` | `https://example.com/pkg.tgz` |

### Configuration

```yaml
deps:
  git_dependency:
    - path: "**/package.json"
      severity: warn
      exclude: ["tests/fixtures/**"]
    - path: "**/pyproject.toml"
      severity: warn
    - path: "**/Cargo.toml"
      severity: warn
```

### Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `path` | string | Yes | — | Glob of the target manifest |
| `exclude` | string[] | No | — | Exclude glob |
| `message` | string | No | — | Custom message |
| `severity` | `"error"` \| `"warn"` | No | `"warn"` | Severity |

### Supported ecosystems

npm / PyPI (pyproject.toml) / Cargo / RubyGems. Go modules and GitHub Actions use different versioning mechanisms and are out of scope.

---

## 10. floating_version

<!-- monban:ref ../../src/rules/deps/floating-version.ts sha256:e3562a847e3c5fa5c1a2f52c1e0e471946a556acc16c363eff9b3d1a30ff4526 -->

Detects version constraints without an upper bound. Where `freshness` looks for "a brand-new published version", this rule checks the **configuration itself that allows any future version**.

### Detection targets

| Pattern | Example | Ecosystem |
|---------|-----|---|
| wildcard | `*` | All |
| `latest` | `latest` | All |
| caret range | `^1.2.3` | npm / cargo / rubygems |
| tilde range | `~1.2.3` | npm / cargo / rubygems |
| x-range | `1.2.x` | npm / cargo / rubygems |
| unbounded lower | `>=1.0` | All |

### Configuration

```yaml
deps:
  floating_version:
    - path: "**/package.json"
      severity: warn
      # Allow `^` only for internal-scope packages
      allowed: ["@myorg/*"]
    - path: "**/requirements.txt"
      severity: error
```

### Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `path` | string | Yes | — | Glob of the target manifest |
| `exclude` | string[] | No | — | Exclude glob |
| `allowed` | string[] | No | — | Package names permitted to float (glob supported) |
| `message` | string | No | — | Custom message |
| `severity` | `"error"` \| `"warn"` | No | `"warn"` | Severity |

---

## Offline mode

Under `--offline`, rules that require network access (`existence` / `freshness` / `popularity` / `cross_ecosystem` / `typosquat`) are skipped; only `allowed` / `forbidden` run. Use this in air-gapped environments or CI that avoids external APIs.

```bash
monban deps --offline
```

---

## Out of scope

The following are not handled by `monban deps`. Leave them to dedicated tools.

| Concern | Owner |
|---|---|
| CVE scanning | Snyk / OSV-Scanner |
| Install-script behavior analysis | Socket |
| License compliance | cargo-deny / licensee |
| Full lockfile resolution | Dependabot / Renovate |

monban focuses on the entry-point check: **does this dependency name exist, and is it what you meant?**

---

## Combining with diff mode

With `--diff`, only newly added dependencies in modified manifests are inspected. This is the most useful mode during PR review. See [diff.md](diff.md) for details.

```bash
monban deps --diff=main
```

---

## Common output

```
$ monban deps

monban deps — dependency checks

  ✗ existence         2 violations
  ✓ freshness
  ✗ popularity        1 violation
  ✓ cross_ecosystem
  ✓ typosquat
  ✓ allowed
  ✓ forbidden

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  3 violations (2 errors, 1 warning)
  5/7 rules passed
```
