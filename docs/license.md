# monban license

> [日本語](./license.ja.md) | **English**

License-identifier checks for the project LICENSE file and source-file headers.

A coding agent that adds new files but forgets the `SPDX-License-Identifier:` header, or replaces a permissive LICENSE with an incompatible one, leaves the project in a broken licensing state. `monban license` detects the license of LICENSE-style files (via SPDX tag or known template text) and verifies SPDX headers in source files.

```bash
monban license                 # run every rule
monban license --rule file     # run a specific rule only
monban license --diff=main     # scope to a diff (details: ./diff.md)
monban license --json          # JSON output
```

The check is **detection-only**. monban does not attempt to enforce license compatibility between dependencies — that is cargo-deny / licensee territory.

---

## Rule list

| # | Rule | Target | Summary |
|---|--------|------|------|
| 1 | `file` | LICENSE-style files | Detect the license and check it against an `allowed` list |
| 2 | `header` | Source files | Each file must have an `SPDX-License-Identifier:` header from an `allowed` list |

---

## Configuration

```yaml
# monban.yml
license:
  file:
    - path: "LICENSE"
      allowed: ["MIT", "Apache-2.0"]
  header:
    - path: "src/**/*.ts"
      exclude: ["src/vendor/**"]
      allowed: ["MIT"]
      within_lines: 5
```

---

## 1. file

Detects the license used in a LICENSE-style file and (optionally) checks it against an allowlist.

Detection is performed in two passes:

1. **SPDX tag** — if the file contains `SPDX-License-Identifier: <id>`, that id wins
2. **Template match** — otherwise, well-known phrases are matched: `MIT License`, `Apache License, Version 2.0`, `BSD 3-Clause`, `BSD 2-Clause`, `ISC License`, `GNU GENERAL PUBLIC LICENSE Version 3` / `Version 2`, `GNU LESSER GENERAL PUBLIC LICENSE Version 3`, `Mozilla Public License, Version 2.0`, `The Unlicense`, `CC0 1.0 Universal`

If neither resolves the license, the file is reported as undetectable.

### Configuration

```yaml
license:
  file:
    - path: "LICENSE"
      allowed: ["MIT", "Apache-2.0"]
      message: "use MIT or Apache-2.0"   # optional
      severity: error                     # optional, default error
```

### Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `path` | string | Yes | Glob for the LICENSE-style file(s). Reported as missing if it matches nothing |
| `allowed` | string[] | No | SPDX identifier allowlist. Omit to check only that *some* license is detected |
| `message` | string | No | Custom message |
| `severity` | `"error"` \| `"warn"` | No | Severity (default `error`) |

### Example output

```
ERROR [file] LICENSE
  未許可のライセンスです: GPL-3.0 (許可: MIT, Apache-2.0)
```

---

## 2. header

Verifies that the first N lines of each source file contain an `SPDX-License-Identifier:` header with an allowed value.

### Configuration

```yaml
license:
  header:
    - path: "src/**/*.ts"
      exclude: ["src/generated/**"]
      allowed: ["MIT"]
      within_lines: 10                # default 10
      message: "missing SPDX header"  # optional
      severity: warn                  # optional, default warn
```

### Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `path` | string | Yes | Glob for source files |
| `exclude` | string[] | No | Globs to exclude |
| `allowed` | string[] | No | Allowed SPDX identifiers. Omit to require *any* SPDX header |
| `within_lines` | integer | No | Search range (default 10) |
| `message` | string | No | Custom message |
| `severity` | `"error"` \| `"warn"` | No | Severity (default `warn`) |

### Example output

```
WARN  [header] src/foo.ts
  先頭 10 行に SPDX-License-Identifier ヘッダがありません。
```

---

## Common output

```
$ monban license

monban license — ライセンスチェック

  ✓ file
  ✗ header               2 violations (warn)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  2 violations (2 warnings)
  1/2 rules passed
```
