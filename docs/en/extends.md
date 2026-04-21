# monban extends

> [日本語](../extends.md) | **English**

A mechanism that lets `monban.yml` inherit other YAML configurations. Useful for organization-wide base rules and cross-team standard rule sets.

- Source: local file or GitHub repository
- Fetch via the git CLI (private repos work through your existing Git auth)
- Rule arrays are concatenated (child rules are appended to parent rules)

```yaml
# monban.yml
extends:
  - type: local
    path: "./shared/base.yml"

  - type: github
    repo: "myorg/monban-standards"
    ref: "main"
    path: "base.yml"

path:
  forbidden:
    - path: "src/legacy/**"  # appended to the inherited rules
```

---

## Configuration

### Fields

The top-level `extends` is an array. Each element is either `type: local` or `type: github`.

| Field | Type | Required | Description |
|-----------|-----|------|------|
| `type` | `"local"` \| `"github"` | Yes | Source kind |
| `path` | string | Yes | Path to the config file |
| `repo` | string | Yes (when `type: github`) | `owner/repo` form |
| `ref` | string | No | Branch, tag, or commit hash (defaults to the default branch) |

---

## 1. local

Inherit a YAML file inside the project or a parent directory.

### Configuration

```yaml
extends:
  - type: local
    path: "./shared/base.yml"
  - type: local
    path: "../../common/monban-base.yml"
```

### Resolution

1. `path` is resolved relative to `monban.yml`
2. If the file does not exist, fail
3. Add the loaded YAML to the merge set

---

## 2. github

Fetch a config from a GitHub repository. monban uses a sparse git clone under the hood, so private repos work with your existing Git authentication.

### Configuration

```yaml
extends:
  - type: github
    repo: "myorg/monban-standards"
    ref: "main"
    path: "base.yml"

  # Branch name
  - type: github
    repo: "myorg/shared-rules"
    ref: "v1"
    path: "path-rules.yml"

  # Commit hash (guarantees reproducibility)
  - type: github
    repo: "myorg/shared-rules"
    ref: "a1b2c3d4e5f6789abc0123def4567890abcdef12"
    path: "content-rules.yml"
```

### Fields

| Field | Type | Required | Description |
|-----------|-----|------|------|
| `type` | `"github"` | Yes | Fixed value |
| `repo` | string | Yes | `owner/repo` form |
| `ref` | string | No | Branch, tag, or commit hash (defaults to the default branch) |
| `path` | string | Yes | Path to the config file from the repo root |

### Fetch

1. Check the cache directory (`~/.cache/monban/github/<owner>/<repo>/<ref-hash>/`)
2. On cache miss:
   - `git clone --depth 1 --no-checkout --filter=blob:none https://github.com/<owner>/<repo>.git <cache-dir>`
   - `git -C <cache-dir> checkout <ref> -- <path>`
3. Add the fetched YAML to the merge set

### Authentication

- **Public repos**: no authentication
- **Private repos**: reuse the existing Git auth stack:
  - SSH keys
  - `~/.gitconfig` credential helpers
  - GitHub CLI (`gh auth login`) credentials
  - The `GITHUB_TOKEN` environment variable (CI fallback)

If you can `git clone` without extra configuration, monban can fetch too.

### ref handling

| `ref` kind | Cache behavior |
|--------------|--------------|
| Commit hash (40-character SHA) | Immutable → persistent cache |
| Branch name / tag | Mutable → re-fetch every run (use cache when offline) |

Use a commit hash when you want reproducibility.

---

## Merge strategy

Every `extends` entry is resolved first, then merged as follows:

- **Rule arrays** (`path.forbidden`, `content.required`, etc.): **concatenated**
- **`exclude`** (the global exclude): **concatenated**
- **Scalars**: last-write-wins (child overrides parent)

### Merge example

**base.yml:**
```yaml
exclude:
  - "**/node_modules/**"

path:
  forbidden:
    - path: "**/utils/**"
      message: "utils/ is disallowed"
```

**monban.yml:**
```yaml
extends:
  - type: local
    path: "./base.yml"

exclude:
  - "**/dist/**"

path:
  forbidden:
    - path: "**/helpers/**"
      message: "helpers/ is disallowed"
```

**Effective configuration:**
```yaml
exclude:
  - "**/node_modules/**"    # from base.yml
  - "**/dist/**"            # from monban.yml

path:
  forbidden:
    - path: "**/utils/**"
      message: "utils/ is disallowed"      # from base.yml
    - path: "**/helpers/**"
      message: "helpers/ is disallowed"    # from monban.yml
```

---

## Transitive resolution

If an inherited YAML itself declares `extends`, **it is not resolved** (it's ignored).

To keep the semantics predictable, `extends` only traverses one level. For deeper inheritance, flatten the config at the source.

---

## Error handling

| Case | Behavior |
|-------|------|
| Local file does not exist | Fail |
| GitHub fetch fails (network unreachable) | Fail (use cache when available) |
| GitHub auth fails | Fail (include setup guidance) |
| Inherited YAML invalid | Fail (identify which `extends` is broken) |
| `ref` does not exist | Fail |

---

## Cache

### Location

- `~/.cache/monban/github/<owner>/<repo>/<ref>/`

### Commands

Planned helper commands:

```bash
monban extends fetch    # pre-fetch every extends
monban extends clear    # clear the cache
```

---

## Example output

Inherited rules are reported the same way as locally defined rules:

```
$ monban all

monban all — all checks

  path
    ✓ forbidden
    ✗ naming        2 violations
  content
    ✓ forbidden

ERROR [naming] src/userProfile.ts
  expected kebab.
  ...
```

To visualize the inheritance source, use `monban config print` (planned).
