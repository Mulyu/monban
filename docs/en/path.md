# monban path

> [日本語](../path.md) | **English**

Path-structure checks. Verifies file and directory existence, naming, depth, and count.

- Language-agnostic, no AST
- Filesystem traversal only (glob / path parsing)
- Every rule uses `path` (a glob pattern) as its selector

```bash
monban path                    # run every rule
monban path --rule forbidden   # run a specific rule only
monban path --diff=main        # scope to a diff (details: ./diff.md)
monban path --json             # JSON output
```

---

## Rule list

| # | Rule | Summary |
|---|--------|------|
| 1 | `required` | Detect missing files that must exist |
| 2 | `forbidden` | Detect paths that must not exist |
| 3 | `naming` | Detect file/directory naming-convention violations |
| 4 | `depth` | Detect directory nesting that exceeds a limit |
| 5 | `count` | Check the upper/lower bound of the number of files in a directory |
| 6 | `size` | Check the upper bound of file size in bytes |
| 7 | `hash` | Pin a single file by SHA256 (template / vendored / generated-file tamper detection) |
| 8 | `case_conflict` | Detect filenames that collide only by case (macOS/Windows damage prevention) |

---

## Configuration

Every rule automatically excludes patterns listed in the top-level `exclude`.

```yaml
# monban.yml
exclude:
  - "**/node_modules/**"
  - "**/vendor/**"

path:
  required:
    - path: "src/handlers/*"
      files: ["index.ts", "schema.ts"]
    - path: "src/components/**/*.tsx"
      exclude: ["**/*.test.tsx"]
      companions: ["{stem}.test.tsx"]

  forbidden:
    - path: "**/utils/**"
      message: "utils/ is disallowed. Put the code in an appropriate module."
    - path: "src/**/*.js"
      message: ".js files are not allowed under src/."

  naming:
    - path: "src/components/**/*.tsx"
      style: pascal
    - path: "src/**/"
      target: directory
      style: kebab

  depth:
    - path: "src"
      max: 4

  count:
    - path: "src/handlers"
      max: 20
```

---

## 1. required

<!-- monban:ref ../../src/rules/path/required.ts sha256:c8830437421369adad6bb499bef67c371685e1f7a0414b7aa917406648a9237b -->

Declare files that must exist relative to a directory or a source file. Two modes:

- **files** — required files inside a directory
- **companions** — a paired file that must exist alongside a source file

### Configuration: files mode

When the target directory exists, the listed files must exist inside it.

```yaml
path:
  required:
    # required files in a directory
    - path: "src/handlers/*"
      files:
        - "index.ts"
        - "schema.ts"

    - path: "packages/*"
      files:
        - "package.json"
        - "README.md"

    # required directories (trailing / marks a directory)
    - path: "src"
      files:
        - "domain/"
        - "application/"
        - "infrastructure/"
```

### Configuration: companions mode

When a file exists, require a paired file to exist.

```yaml
path:
  required:
    # same-directory companion (default: root unset)
    - path: "src/components/**/*.tsx"
      exclude: ["**/*.test.tsx", "**/*.stories.tsx"]
      companions:
        - pattern: "{stem}.test.tsx"
          required: true
        - pattern: "{stem}.stories.tsx"
          required: false    # warn only

    # cross-directory companion (root: true anchors at the repository root)
    - path: "app/models/**/*.rb"
      companions:
        - pattern: "spec/models/{stem}_spec.rb"
          required: true
          root: true
```

`{stem}` expands to the source file's name without its extension.

The `root` field controls how the pattern is resolved.

- `root` unset (default) — resolved relative to the source file's directory. Example: `{stem}.test.tsx` for `src/components/UserProfile.tsx` resolves to `src/components/UserProfile.test.tsx`.
- `root: true` — resolved relative to the repository root. Example: `spec/models/{stem}_spec.rb` for `app/models/user.rb` resolves to `spec/models/user_spec.rb`.

The check remains one-directional ("source exists → companion must exist"; no reverse check).

### Fields

| Field | Type | Required | Description |
|-----------|-----|------|------|
| `path` | string | Yes | Glob pattern for targets |
| `exclude` | string[] | No | Exclude patterns |
| `files` | string[] | No* | Required file names (trailing `/` for directories) |
| `companions` | CompanionDef[] | No* | Companion-file definitions |

\* One of `files` or `companions` is required.

**CompanionDef:**

| Field | Type | Required | Default | Description |
|-----------|-----|------|-----------|------|
| `pattern` | string | Yes | — | Companion file pattern (supports `{stem}`) |
| `required` | boolean | Yes | — | `true` = error, `false` = warn |
| `root` | boolean | No | `false` | `true` to anchor at repo root, `false` to anchor at the source file's directory |

### Example output

```
ERROR [required] src/handlers/invoice/
  required file not found: schema.ts

ERROR [required] src/components/UserProfile.tsx
  companion file not found: UserProfile.test.tsx

WARN  [required] src/components/UserProfile.tsx
  companion file not found: UserProfile.stories.tsx
```

---

## 2. forbidden

<!-- monban:ref ../../src/rules/path/forbidden.ts sha256:550b88f8a963672c732389404fe13f4d039513e5eff20d980830f80659a24276 -->

Declare files or directories that must not exist.

Coding agents like to spin up vague directories such as `utils/` or `helpers/`. This rule also covers extension restrictions and top-level structure control.

### Configuration

```yaml
path:
  forbidden:
    # forbidden directory
    - path: "**/utils/**"
      message: "utils/ is disallowed. Put the code in an appropriate module."
    - path: "**/helpers/**"
      message: "helpers/ is disallowed."

    # forbidden extension
    - path: "src/**/*.js"
      message: ".js files are not allowed under src/."

    # temp files
    - path: "**/*.temp.*"
      severity: warn
      message: "Do not commit temporary files."

    # top-level structure control
    - path: "src/!(domain|application|infrastructure|presentation)/"
      message: "Do not add undefined directories directly under src/."
```

### Fields

| Field | Type | Required | Default | Description |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | Forbidden glob pattern |
| `type` | `"file"` \| `"directory"` \| `"symlink"` | No | — | Restrict to an entry kind (any kind if unset) |
| `message` | string | No | — | Error message |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | Severity |

`type: symlink` makes it easy to disallow symlinks across the repo:

```yaml
path:
  forbidden:
    - path: "**"
      type: symlink
      message: "Symlinks are disallowed."
```

### Example output

```
ERROR [forbidden] src/utils/format.ts
  utils/ is disallowed. Put the code in an appropriate module.

ERROR [forbidden] src/legacy/handler.js
  .js files are not allowed under src/.

WARN  [forbidden] tmp/draft.temp.md
  Do not commit temporary files.
```

---

## 3. naming

<!-- monban:ref ../../src/rules/path/naming.ts sha256:940d7a1d664ab9829783bafaa3d880669aa40162c72be4f9ce63bee9ef8d213a -->

Enforce a naming style for files and directories. Starts from a location and checks the names of files/directories there.

Coding agents tend to create files without checking the existing convention, mixing PascalCase and kebab-case.

### Configuration

```yaml
path:
  naming:
    - path: "src/components/**/*.tsx"
      style: PascalCase

    - path: "src/**/"
      target: directory
      style: kebab-case

    - path: "app/models/**/*.rb"
      style: snake

    - path: "src/hooks/**/*.ts"
      style: camel
      prefix: "use"

    - path: "src/domain/**/entities/**/*.ts"
      style: pascal
      suffix: ".entity"
```

### Fields

| Field | Type | Required | Default | Description |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | Glob pattern for targets |
| `target` | `"file"` \| `"directory"` | No | `"file"` | What to check |
| `style` | NamingStyle | Yes | — | Naming style |
| `prefix` | string | No | — | Required prefix |
| `suffix` | string | No | — | Required suffix (applied to the name without extension) |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | Severity |

**NamingStyle:**

`pascal` / `camel` / `kebab` / `snake`

### Example output

```
ERROR [naming] src/components/user_profile.tsx
  expected pascal.
  got: user_profile.tsx

ERROR [naming] src/hooks/auth.ts
  expected prefix "use".
  got: auth.ts
```

---

## 4. depth

<!-- monban:ref ../../src/rules/path/depth.ts sha256:f10e9e5c4c142e578c2a6af296dddede8ab934a3662ce30109c3c0e5a3fa04a9 -->

Cap directory nesting depth.

Coding agents sometimes mechanically dig subdirectories, producing needlessly deep trees.

### Configuration

```yaml
path:
  depth:
    - path: "src"
      max: 4

    - path: "packages/*/src"
      max: 3

    exclude:
      - "**/generated/**"
      - "**/vendor/**"
```

### Fields

| Field | Type | Required | Description |
|-----------|-----|------|------|
| `path` | string | Yes | Base directory |
| `max` | number | Yes | Max depth from the base |
| `exclude` | string[] | No | Exclude patterns (shared across the ruleset) |

### Example output

```
ERROR [depth] src/domain/user/profile/settings/theme.ts
  depth 5 exceeds limit 4 (base: src/)
```

---

## 5. count

<!-- monban:ref ../../src/rules/path/count.ts sha256:6596f61566e4ca8af19628768eb1a744deaeed64b2b5033dde038db0ef7654e4 -->

Cap the number of files in a directory.

Coding agents often pile many files into a single directory instead of splitting responsibilities.

### Configuration

```yaml
path:
  count:
    - path: "src/handlers"
      max: 20

    - path: "src/components"
      max: 30
      exclude: ["index.ts"]
```

### Fields

| Field | Type | Required | Description |
|-----------|-----|------|------|
| `path` | string | Yes | Target directory |
| `max` | number | No* | Maximum file count |
| `min` | number | No* | Minimum file count |
| `exclude` | string[] | No | Patterns excluded from the count |

\* At least one of `max` or `min` is required. Specifying both produces a range check.

### Example output

```
ERROR [count] src/handlers/
  24 files exceeds limit 20.

ERROR [count] src/rules/
  0 files is below minimum 1.
```

---

## 6. size

<!-- monban:ref ../../src/rules/path/size.ts sha256:f54d72a23a1edde734b5f895d3caee71f8ca7f940706244da9cde15ae7f058ee -->

Cap file size in bytes. Where `content.size` counts lines, this rule targets binaries, images, bundle artifacts, and the like.

### Configuration

```yaml
path:
  size:
    # Prevent image assets from bloating
    - path: "assets/**/*.{png,jpg,gif}"
      max_bytes: 102400  # 100 KiB
      severity: warn

    # Guard against config files ballooning
    - path: "config/**/*.json"
      max_bytes: 10240   # 10 KiB
```

### Fields

| Field | Type | Required | Default | Description |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | Glob for target files |
| `exclude` | string[] | No | — | Exclude glob |
| `max_bytes` | integer | Yes | — | Byte-size limit |
| `message` | string | No | — | Custom message |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | Severity |

### Example output

```
WARN  [size] assets/banner.png
  size 412.3 KiB exceeds limit 100.0 KiB.
```

---

## 7. hash

<!-- monban:ref ../../src/rules/path/hash.ts sha256:5427e3c0b0222579544c2d206c19d781c4774a535d8740014af9240e1563b7c3 -->

Pin a single file to a SHA256. Detects tampering of LICENSE templates, vendored files, or generated artifacts.

This is distinct from `doc.ref` (a cross-file check where A embeds B's hash); `hash` only verifies that a particular file is a known byte sequence.

### Configuration

```yaml
path:
  hash:
    # Pin an organization-wide LICENSE template
    - path: "LICENSE"
      sha256: "f288702d2fa16d3cdf0035b15a9eecc3866f4ddc5c1f6f5a2f8c8b4a0c1f4..."
      message: "Use the organization LICENSE template."

    # Detect tampering with a vendored script
    - path: "vendor/setup.sh"
      sha256: "8a2c..."
```

### Fields

| Field | Type | Required | Default | Description |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | Glob for target file (typically a single file) |
| `sha256` | string (64-digit hex) | Yes | — | Expected SHA256 |
| `message` | string | No | — | Custom message |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | Severity |

### Example output

```
ERROR [hash] LICENSE
  hash mismatch: expected f288702d2fa1... actual 9b5fe22e4730...
  Use the organization LICENSE template.
```

---

## 8. case_conflict

<!-- monban:ref ../../src/rules/path/case-conflict.ts sha256:0f66bf1e1692fc004b5db2bd206df0714e54cef8b351ad4ea0fbc18c59db71c5 -->

Detect filenames inside the same directory that collide only by letter case. Prevents the bug where one of the two vanishes when the repo is opened on a case-insensitive filesystem (macOS / Windows).

### Configuration

```yaml
path:
  case_conflict:
    - path: "**/*"
      exclude: ["node_modules/**"]
```

### Fields

| Field | Type | Required | Default | Description |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | Glob for target files/directories |
| `exclude` | string[] | No | — | Exclude glob |
| `message` | string | No | — | Custom message |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | Severity |

### Example output

```
ERROR [case_conflict] src/{Foo.ts, foo.ts}
  case-only conflict: Foo.ts, foo.ts
```

---

## Common output

```
$ monban path

monban path — path checks

  ✗ forbidden     2 violations
  ✓ required
  ✗ naming        1 violation
  ✓ depth
  ✗ count         1 violation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  4 violations
  3/5 rules passed
```
