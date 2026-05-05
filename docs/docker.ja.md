# monban docker

> **日本語** | [English](./docker.md)

Dockerfile のチェック: タグピン留め、USER、HEALTHCHECK、禁止命令。

エージェントが `FROM node:latest`、USER 指定なし、`ADD https://...` 入りの Dockerfile を生成する事故を抑える。`monban docker` は Dockerfile を行ベースで解析し、典型的な落とし穴を検出する。

```bash
monban docker                       # すべてのルールを実行
monban docker --rule pinned         # 特定ルールだけ実行
monban docker --diff=main           # 差分スコープに限定 (詳細: ./diff.md)
monban docker --json                # JSON 出力
```

判定は **浅い**：各命令を独立して見るだけで、ステージ間のデータフロー解析はしない。深い検査は hadolint の領域。`docker-compose` / Kubernetes manifest はスコープ外。

---

## ルール一覧

| # | Rule | 対象 | 概要 |
|---|--------|------|------|
| 1 | `pinned` | `FROM` 命令 | ベースイメージはタグ（または digest）でピン留めが必須 |
| 2 | `user` | `USER` 命令 | `USER` 指定が必須かつ `root` / `0` を禁止 |
| 3 | `healthcheck` | `HEALTHCHECK` 命令 | 各 Dockerfile に `NONE` 以外の HEALTHCHECK が必要 |
| 4 | `forbidden` | 任意の命令 | 命令そのものを禁止、または引数を regex で照合して禁止 |

---

## 設定

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

`FROM` 命令がベースイメージをピン留めしていることを検証する。既定では `:latest` とタグなしの両方を禁止。`digest: true` を指定すると `@sha256:` でのピン留めを必須化する。

マルチステージビルドで前段ステージを参照する `FROM <stage>` はスキップ（外部イメージのみが対象）。

### 設定

```yaml
docker:
  pinned:
    - path: "**/Dockerfile"
      exclude: ["**/test/**"]
      digest: true             # 既定 false
      severity: error          # 既定 error
```

### フィールド

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `path` | string | はい | Dockerfile の glob |
| `exclude` | string[] | いいえ | 除外する glob |
| `digest` | boolean | いいえ | `true` なら `image@sha256:...` のみ許可。タグも違反扱い |
| `message` | string | いいえ | 既定メッセージの差し替え |
| `severity` | `"error"` \| `"warn"` | いいえ | 重大度（既定 `error`） |

### 出力例

```
ERROR [pinned] Dockerfile
  FROM node:latest は :latest を使用しています (line 1)。具体的なタグまたは digest にしてください。
```

---

## 2. user

Dockerfile に `USER` 指定があり、その値が denylist に該当しないことを検証する。既定の denylist は `["root", "0", "0:0"]`。

### 設定

```yaml
docker:
  user:
    - path: "**/Dockerfile"
      required: true                       # 既定 true
      forbidden: ["root", "0", "0:0"]      # 既定
      severity: error
```

### フィールド

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `path` | string | はい | Dockerfile の glob |
| `exclude` | string[] | いいえ | 除外する glob |
| `required` | boolean | いいえ | `USER` 命令を最低 1 回要求（既定 `true`） |
| `forbidden` | string[] | いいえ | 禁止する `USER` 値（既定 `["root", "0", "0:0"]`） |
| `message` | string | いいえ | 既定メッセージの差し替え |
| `severity` | `"error"` \| `"warn"` | いいえ | 重大度（既定 `error`） |

---

## 3. healthcheck

Dockerfile に有効な `HEALTHCHECK` があることを検証する。`HEALTHCHECK NONE` は HEALTHCHECK なしと同等扱い。

### 設定

```yaml
docker:
  healthcheck:
    - path: "**/Dockerfile"
      required: true   # 既定 true
      severity: warn   # 既定 warn
```

### フィールド

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `path` | string | はい | Dockerfile の glob |
| `exclude` | string[] | いいえ | 除外する glob |
| `required` | boolean | いいえ | `NONE` 以外の `HEALTHCHECK` を要求（既定 `true`） |
| `message` | string | いいえ | 既定メッセージの差し替え |
| `severity` | `"error"` \| `"warn"` | いいえ | 重大度（既定 `warn`） |

---

## 4. forbidden

Dockerfile の特定命令を禁止する。命令そのものを丸ごと禁止する書き方と、引数を regex で照合する書き方の両方ができる（後者で「`ADD https://...` だけ禁止」が表現できる）。

### 設定

```yaml
docker:
  forbidden:
    - path: "**/Dockerfile"
      instructions:
        - name: "ADD"
          pattern: "^https?://"
          message: "ADD <URL> ではなく COPY + curl を使ってください"
        - name: "MAINTAINER"   # 命令ごと禁止
      severity: error
```

### フィールド（エントリ）

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `name` | string | はい | 大文字の Dockerfile 命令名（`ADD`、`RUN`、`COPY` 等） |
| `pattern` | string | いいえ | 引数文字列に適用する regex。省略すると命令そのものを禁止 |
| `message` | string | いいえ | このエントリ用のメッセージ |

### トップレベルフィールド

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `path` | string | はい | Dockerfile の glob |
| `exclude` | string[] | いいえ | 除外する glob |
| `instructions` | object[] | はい | 最低 1 エントリ |
| `severity` | `"error"` \| `"warn"` | いいえ | 重大度（既定 `error`） |

### 出力例

```
ERROR [forbidden] Dockerfile
  ADD https://example.com/installer.sh /tmp/installer.sh はパターン /^https?:\/\// に一致するため禁止されています (line 2)。
```

---

## 共通出力

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
