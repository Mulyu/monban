# monban docker

> [日本語](./docker.ja.md) | **English**

Dockerfile checks: tag pinning, USER, HEALTHCHECK, and forbidden instructions.

A coding agent that adds a Dockerfile with `FROM node:latest`, no `USER`, and `ADD https://...` baked into a build step writes a footgun. `monban docker` parses Dockerfiles line-by-line and flags the well-known shapes that go wrong.

```bash
monban docker                       # run every rule
monban docker --rule pinned         # run a specific rule only
monban docker --diff=main           # scope to a diff (details: ./diff.md)
monban docker --json                # JSON output
```

The check is **shallow**: it inspects each instruction independently, with no cross-stage data flow analysis. Deeper inspection is hadolint's territory; `docker-compose` / Kubernetes manifests are out of scope.

---

## Rule list

| # | Rule | Target | Summary |
|---|--------|------|------|
| 1 | `pinned` | `FROM` instruction | Image must be pinned with a tag (or digest) |
| 2 | `user` | `USER` instruction | `USER` is required and must not be `root`/`0` |
| 3 | `healthcheck` | `HEALTHCHECK` instruction | Each Dockerfile must declare a non-`NONE` HEALTHCHECK |
| 4 | `forbidden` | Any instruction | Allow blocking instructions wholesale, or matching their args against a regex |

---

## Configuration

```yaml
# monban.yml
docker:
  pinned:
    - path: "**/Dockerfile"
  user:
    - path: "**/Dockerfile"
  healthcheck:
    - path: "**/Dockerfile"
  forbidden:
    - path: "**/Dockerfile"
      instructions:
        - { name: "ADD", pattern: "^https?://" }
```

---

## 1. pinned

Verifies that every `FROM` instruction pins the base image. The default forbids both `:latest` and missing tags. Setting `digest: true` requires pinning by `@sha256:` digest.

References to earlier stages in multi-stage builds (`FROM <stage>`) are skipped — the rule only applies to external base images.

### Configuration

```yaml
docker:
  pinned:
    - path: "**/Dockerfile"
      exclude: ["**/test/**"]
      digest: true             # default false
      severity: error          # default error
```

### Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `path` | string | Yes | Glob for Dockerfiles |
| `exclude` | string[] | No | Globs to exclude |
| `digest` | boolean | No | When `true`, only `image@sha256:...` passes; tags are rejected |
| `message` | string | No | Custom message |
| `severity` | `"error"` \| `"warn"` | No | Severity (default `error`) |

### Example output

```
ERROR [pinned] Dockerfile
  FROM node:latest は :latest を使用しています (line 1)。具体的なタグまたは digest にしてください。
```

---

## 2. user

Verifies that the Dockerfile sets `USER` and that none of the declared `USER` values fall in a denylist. The default denylist is `["root", "0", "0:0"]`.

### Configuration

```yaml
docker:
  user:
    - path: "**/Dockerfile"
      required: true                       # default true
      forbidden: ["root", "0", "0:0"]      # default
      severity: error
```

### Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `path` | string | Yes | Glob for Dockerfiles |
| `exclude` | string[] | No | Globs to exclude |
| `required` | boolean | No | Require at least one `USER` instruction (default `true`) |
| `forbidden` | string[] | No | Disallowed `USER` values (default `["root", "0", "0:0"]`) |
| `message` | string | No | Custom message |
| `severity` | `"error"` \| `"warn"` | No | Severity (default `error`) |

---

## 3. healthcheck

Verifies that the Dockerfile declares an effective `HEALTHCHECK`. `HEALTHCHECK NONE` is treated as no HEALTHCHECK.

### Configuration

```yaml
docker:
  healthcheck:
    - path: "**/Dockerfile"
      required: true   # default true
      severity: warn   # default warn
```

### Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `path` | string | Yes | Glob for Dockerfiles |
| `exclude` | string[] | No | Globs to exclude |
| `required` | boolean | No | Require a non-`NONE` `HEALTHCHECK` (default `true`) |
| `message` | string | No | Custom message |
| `severity` | `"error"` \| `"warn"` | No | Severity (default `warn`) |

---

## 4. forbidden

Blocks specific Dockerfile instructions. Each entry can match either the bare instruction (block all `ADD`s) or instructions whose argument matches a regex (block `ADD https://...`).

### Configuration

```yaml
docker:
  forbidden:
    - path: "**/Dockerfile"
      instructions:
        - name: "ADD"
          pattern: "^https?://"
          message: "use COPY + curl instead of ADD <URL>"
        - name: "MAINTAINER"   # blocked wholesale
      severity: error
```

### Fields (entry)

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Instruction in uppercase (`ADD`, `RUN`, `COPY`, ...) |
| `pattern` | string | No | Regex applied to the instruction's argument string. Omit to block the instruction wholesale |
| `message` | string | No | Custom message for this entry |

### Top-level fields

| Field | Type | Required | Description |
|---|---|---|---|
| `path` | string | Yes | Glob for Dockerfiles |
| `exclude` | string[] | No | Globs to exclude |
| `instructions` | object[] | Yes | At least one entry |
| `severity` | `"error"` \| `"warn"` | No | Severity (default `error`) |

### Example output

```
ERROR [forbidden] Dockerfile
  ADD https://example.com/installer.sh /tmp/installer.sh はパターン /^https?:\/\// に一致するため禁止されています (line 2)。
```

---

## Common output

```
$ monban docker

monban docker — Docker チェック

  ✗ pinned               1 violation
  ✗ user                 1 violation
  ✗ healthcheck          1 violation (warn)
  ✗ forbidden            1 violation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  4 violations (3 errors, 1 warning)
  0/4 rules passed
```
