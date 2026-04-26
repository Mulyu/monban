# monban runtime

> [日本語](./runtime.ja.md) | **English**

Cross-file consistency checks for runtime version pins (`.nvmrc` / `package.json#engines` / `Dockerfile FROM` / GitHub Actions matrix, etc.).

A coding agent that bumps `.nvmrc` to Node 22 but leaves the `Dockerfile` on Node 20 and the GitHub Actions matrix on Node 18 produces the classic "works on my machine" drift. `monban runtime` extracts a value from each declared source and reports when they disagree.

```bash
monban runtime                        # run every rule
monban runtime --rule consistency     # run a specific rule only
monban runtime --diff=main            # scope to a diff (details: ./diff.md)
monban runtime --json                 # JSON output
```

The check is **N → 1**: every source must resolve to the same string. There is no "source of truth" file — the rule is symmetric across sources. Comparison is exact string match (`"20.11.0"` and `">=20"` are *not* considered equal); use `pattern` to extract a normalized substring when needed.

---

## Rule list

| # | Rule | Target | Summary |
|---|--------|------|------|
| 1 | `consistency` | Any text / JSON / YAML files | Same runtime version is pinned consistently across multiple files |

---

## Configuration

```yaml
# monban.yml
runtime:
  consistency:
    - name: "node"
      sources:
        - path: ".nvmrc"
        - path: "package.json"
          json_key: "engines.node"
        - path: "Dockerfile"
          pattern: "^FROM node:([\\d.]+)"
        - path: ".github/workflows/*.yml"
          yaml_key: "jobs.*.steps.*.with.node-version"
```

Multiple rules can coexist (one per runtime / language). Each rule's `sources` list mixes extraction methods freely.

---

## 1. consistency

<!-- monban:ref ../src/rules/runtime/consistency.ts sha256:98f652223a558344e304d7631bdfa8b7f9fbeb53e0f610f50d725edb29b8c984 -->

Verifies that the runtime version pinned in multiple places resolves to the same string.

### Configuration

```yaml
runtime:
  consistency:
    - name: "node"
      sources:
        - path: ".nvmrc"
        - path: "package.json"
          json_key: "engines.node"
        - path: "Dockerfile"
          pattern: "^FROM node:([\\d.]+)"
        - path: ".github/workflows/*.yml"
          yaml_key: "jobs.*.steps.*.with.node-version"
      message: "node versions disagree"   # optional
      severity: error                     # optional, default error

    - name: "python"
      sources:
        - path: ".python-version"
        - path: "pyproject.toml"
          pattern: "^requires-python\\s*=\\s*\"[^\\d]*([\\d.]+)"
```

### Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Human label used in messages (e.g. `node`, `python`) |
| `sources` | object[] | Yes | One or more sources to extract values from |
| `message` | string | No | Custom message in place of the default |
| `severity` | `"error"` \| `"warn"` | No | Severity (default `error`) |

### Source fields

| Field | Type | Required | Description |
|---|---|---|---|
| `path` | string | Yes | Glob for files to extract from |
| `pattern` | string | No\* | Regex; capture group 1 (or the full match if no group) is the extracted value, applied across the whole file (multiline) |
| `json_key` | string | No\* | Dot-separated path through a JSON document. `*` matches every key/index at one level |
| `yaml_key` | string | No\* | Same syntax as `json_key`, applied to a parsed YAML document |

\* `pattern`, `json_key`, and `yaml_key` are mutually exclusive. When none is set, the source's value is the file content trimmed.

### Algorithm

1. For each source, glob the `path` and extract a value (or list of values) from each matching file using the chosen method
2. Group all `(file, value)` data points across every source by value
3. If exactly one unique value exists, the rule passes
4. Otherwise report on every file that contributed any value, listing all distinct values found

A source whose extractor finds nothing (file missing, JSON parse error, regex no-match) contributes no data points; it is silently skipped, never the cause of a violation. Use `path.required` and `content.forbidden` for existence / parse-validity checks.

### Example output

```
ERROR [consistency] .nvmrc
  node のバージョンが一貫していません: 18.20.0, 20.11.0, 22.0.0

ERROR [consistency] Dockerfile
  node のバージョンが一貫していません: 18.20.0, 20.11.0, 22.0.0
```

---

## Common output

```
$ monban runtime

monban runtime — ランタイムチェック

  ✗ consistency        4 violations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  4 violations (4 errors)
  0/1 rules passed
```
