# monban doc

> [日本語](../doc.md) | **English**

Documentation integrity checks. Verifies referenced-file hashes and detects broken links.

- Filesystem scan only (no git required)
- The selector is `path` (a glob pattern) that targets Markdown files

```bash
monban doc                     # run every rule
monban doc --rule ref          # run a specific rule only
monban doc --diff=main         # scope to a diff (details: ./diff.md)
monban doc --json              # JSON output
```

---

## Rule list

| # | Rule | Summary |
|---|--------|------|
| 1 | `ref` | Verify that files referenced with `monban:ref` markers still match their recorded hash |
| 2 | `link` | Detect broken relative links in Markdown |

---

## Configuration

```yaml
# monban.yml
doc:
  ref:
    - path: "docs/**/*.md"
    - path: "*.md"

  link:
    - path: "docs/**/*.md"
    - path: "*.md"
```

---

## 1. ref

<!-- monban:ref ../src/rules/doc/ref.ts sha256:f1ed5c220f6109c37aaf4a79ff87a7f947901fb23f3644bb4dbaf9b5496c2589 -->

Verifies that files referenced via a `monban:ref` marker still hash to the recorded value.

This catches the case where code changes land but the doc that references it was not updated.

### Marker format

```markdown
<!-- monban:ref src/auth.ts sha256:a3f1c2... -->
```

### Configuration

```yaml
doc:
  ref:
    - path: "docs/**/*.md"
    - path: "ARCHITECTURE.md"
```

### Fields

| Field | Type | Required | Description |
|-----------|-----|------|------|
| `path` | string | Yes | Glob pattern for target Markdown files |

### Algorithm

1. Extract `<!-- monban:ref <filepath> <algo>:<hash> -->` markers from target files
2. Read the referenced file and compute its hash with the stated algorithm
3. If the marker's hash does not match, report a violation
4. If the referenced file does not exist, report a violation

### Example output

```
ERROR [ref] docs/architecture.md:15
  hash mismatch: src/auth.ts (expected: a3f1c2... actual: 7b2e9d...)

ERROR [ref] docs/api.md:8
  referenced file not found: src/old-handler.ts
```

---

## 2. link

<!-- monban:ref ../src/rules/doc/link.ts sha256:9f4442bb0bb2df56d102ad59e5d061217aa93f2780676f557426387c1dd9e401 -->

Verifies that relative links inside Markdown point at files that actually exist.

This catches the case where a coding agent renames or deletes a file but leaves the old link in place.

### Configuration

```yaml
doc:
  link:
    - path: "docs/**/*.md"
    - path: "*.md"
```

### Fields

| Field | Type | Required | Default | Description |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | Glob pattern for target Markdown files |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | Severity |

### Algorithm

1. Extract Markdown links from target files
2. Skip external URLs (`http://`, `https://`, `mailto:`)
3. Skip anchor-only links (`#section`)
4. For anchor-suffixed links (`./file.md#section`), strip the anchor and check file existence
5. If the linked file does not exist, report a violation

### Example output

```
ERROR [link] docs/guide.md:42
  broken link: ./old-page.md

ERROR [link] README.md:15
  broken link: docs/removed-section.md#overview
```

---

## Common output

```
$ monban doc

monban doc — documentation checks

  ✓ ref
  ✗ link         2 violations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  2 violations (2 errors)
  1/2 rules passed
```
