# monban github

GitHub 特有ファイル（ワークフロー・CODEOWNERS）の構造チェック。YAML パースと独自構文パースに特化する。

- `github.actions.*` — `.github/workflows/**/*.yml` を YAML としてパース
- `github.codeowners.*` — `.github/CODEOWNERS` / `CODEOWNERS` / `docs/CODEOWNERS` を独自構文でパース
- セレクタは `path`（glob パターン）

```bash
monban github                              # 全ルール実行
monban github --rule actions.pinned        # 特定ルールのみ
monban github --rule codeowners.ownership
monban github --diff=main                  # 差分スコープのみ（詳細: ./diff.md）
monban github --json                       # JSON 出力
```

ルール名はドット区切り（`<対象ファイル群>.<ルール>`）で指定する。`path` フィールドを各ルール配下で明示的に書く運用で、対象ファイルの暗黙固定はしない。

GitHub 関連でも、構造パースが不要なもの（`LICENSE` / `SECURITY.md` の存在、PR テンプレートの必須セクション、`continue-on-error: true` 禁止 など）は `path.required` / `content.required` / `content.forbidden` で表現し、`github` に取り込まない。

---

## ルール一覧

| # | ルール | 対象 | 概要 |
|---|--------|------|------|
| 1 | `actions.pinned` | workflows | `uses` のアクション・reusable workflow・docker image のピン留め |
| 2 | `actions.required` | workflows | 必須ワークフロー・必須ステップ |
| 3 | `actions.forbidden` | workflows | 禁止アクション |
| 4 | `actions.permissions` | workflows | `permissions:` の宣言必須・禁止スカラー値 |
| 5 | `actions.triggers` | workflows | `on:` イベントの allow / deny |
| 6 | `actions.runner` | workflows | `runs-on:` の allowlist |
| 7 | `actions.timeout` | workflows | job に `timeout-minutes:` 必須・上限 |
| 8 | `actions.concurrency` | workflows | `concurrency:` 宣言必須 |
| 9 | `actions.consistency` | workflows | 同一アクションのバージョン一貫性 |
| 10 | `actions.secrets` | workflows | `${{ secrets.X }}` 参照の allowlist |
| 11 | `actions.danger` | workflows | `pull_request_target` + `actions/checkout` の危険な組み合わせと `persist-credentials` 未指定を検出 |
| 12 | `actions.injection` | workflows | 信頼できない `${{ github.event.* }}` 入力が `run:` ステップに直埋めされる script injection を検出 |
| 13 | `codeowners.ownership` | CODEOWNERS | path → owners の一方向整合 |

---

## 設定

```yaml
# monban.yml
github:
  actions:
    pinned:
      - path: ".github/workflows/**/*.yml"
        targets: ["action", "reusable", "docker"]

    required:
      - file: ".github/workflows/test.yml"
      - path: ".github/workflows/test.yml"
        steps: ["actions/checkout", "actions/setup-node"]

    forbidden:
      - path: ".github/workflows/**/*.yml"
        uses: "actions/create-release"
        message: "release-please を使ってください。"

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

  codeowners:
    ownership:
      - path: "src/payments/**"
        owners: ["@myorg/payments-team"]
        message: "payments 配下は payments-team のレビュー必須"
```

`github.actions` と `github.codeowners` はそれぞれオブジェクトで、配下にルール配列を持つ。各ルールは `path` を必須で取り、対象ファイル群を glob で明示する。

---

## 1. actions.pinned

`uses` で指定された参照がコミットハッシュで固定されているかを検証する。

タグ（`@v4`、`@main` など）は可変でありサプライチェーン攻撃のリスクがある。

### 設定

```yaml
github:
  actions:
    pinned:
      - path: ".github/workflows/**/*.yml"
        targets: ["action", "reusable", "docker"]
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象ワークフローファイルの glob |
| `targets` | string[] | No | `["action"]` | ピン留めを検査する参照の種類 |

`targets` に指定できる値:

| 値 | 対象 | 判定 |
|----|------|------|
| `action` | step 内 `uses:` のアクション（例: `actions/checkout@...`） | 40 桁の 16 進数 |
| `reusable` | job 直下 `uses:` の reusable workflow（例: `owner/repo/.github/workflows/x.yml@...`） | 40 桁の 16 進数 |
| `docker` | step 内 `uses: docker://...` | `@sha256:` で始まる 64 桁 16 進数 |

ローカル参照（`./` で始まる）はスキップする。

### 出力例

```
ERROR [actions.pinned] .github/workflows/test.yml
  ハッシュ固定されていません: actions/checkout@v4
```

---

## 2. actions.required

必須ワークフローファイルの存在と、ワークフロー内の必須ステップを検証する。

### 設定

```yaml
github:
  actions:
    required:
      - file: ".github/workflows/test.yml"        # 存在チェック
      - path: ".github/workflows/test.yml"        # ステップ存在チェック
        steps: ["actions/checkout", "actions/setup-node"]
```

### フィールド

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `file` | string | No* | 必須ワークフローファイルのパス |
| `path` | string | No* | 対象ワークフローファイルのパス |
| `steps` | string[] | No | 必須ステップ（`uses` の前方一致） |

\* `file` または `path` + `steps` のいずれかが必須。

### 出力例

```
ERROR [actions.required] .github/workflows/lint.yml
  必須ワークフローが見つかりません。
```

---

## 3. actions.forbidden

使用を禁止するアクションを検出する。

### 設定

```yaml
github:
  actions:
    forbidden:
      - path: ".github/workflows/**/*.yml"
        uses: "actions/create-release"
        message: "release-please を使ってください。"
        severity: warn
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象 glob |
| `uses` | string | Yes | — | 禁止アクション（前方一致） |
| `message` | string | No | — | エラーメッセージ |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |

---

## 4. actions.permissions

ワークフローの `permissions:` 宣言を検証する。GitHub は `permissions:` 未宣言時に `GITHUB_TOKEN` へ広い権限を与えるため、明示宣言が望ましい。

### 設定

```yaml
github:
  actions:
    permissions:
      - path: ".github/workflows/**/*.yml"
        required: true              # 宣言必須（デフォルト true）
        forbidden: ["write-all"]    # 禁止する権限スカラー値
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象 glob |
| `required` | boolean | No | `true` | `permissions:` の宣言を必須にするか |
| `forbidden` | string[] | No | `[]` | 禁止するスカラー値（`write-all` / `read-all` など） |

### 判定

1. `required: true` の場合、workflow トップレベル `permissions:` キーの存在を確認
2. workflow トップレベル・各 job の `permissions:` がスカラー値で `forbidden` に含まれる場合は違反

### 出力例

```
ERROR [actions.permissions] .github/workflows/release.yml
  permissions: が宣言されていません。
ERROR [actions.permissions] .github/workflows/ci.yml
  禁止された permissions スカラー: write-all
```

---

## 5. actions.triggers

ワークフローの `on:` イベントを検証する。

`pull_request_target` のような危険なトリガーの混入、手動実行（`workflow_dispatch`）の必須化などに用いる。

### 設定

```yaml
github:
  actions:
    triggers:
      - path: ".github/workflows/**/*.yml"
        allowed: ["push", "pull_request", "workflow_dispatch"]
        forbidden: ["pull_request_target"]
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象 glob |
| `allowed` | string[] | No | `[]` | 許可するイベント（指定時は allowlist） |
| `forbidden` | string[] | No | `[]` | 禁止するイベント |

`on:` はスカラー / 配列 / マップ記法に対応する。

### 判定

1. `on:` からイベント名を抽出（例: `on: push` → `["push"]`、`on: [push, pull_request]` → `["push", "pull_request"]`、`on: { push: {...} }` → `["push"]`）
2. `allowed` 指定時、その集合に含まれないイベントがあれば違反
3. `forbidden` 指定時、いずれかが含まれれば違反

---

## 6. actions.runner

job の `runs-on:` の allowlist を検証する。

コストやセキュリティの観点で、特定のランナー（`self-hosted`、`macos-*`）を制限したいケースに使う。

### 設定

```yaml
github:
  actions:
    runner:
      - path: ".github/workflows/**/*.yml"
        allowed: ["ubuntu-latest", "ubuntu-22.04"]
```

### フィールド

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `path` | string | Yes | 対象 glob |
| `allowed` | string[] | Yes | 許可するランナーラベル |

### 判定

1. 各 job の `runs-on:` を抽出（文字列 / 配列）
2. `${{ ... }}` を含む式はスキップ（静的評価不能のため）
3. `allowed` に含まれないラベルがあれば違反

---

## 7. actions.timeout

全 job に `timeout-minutes:` が設定されているか、かつ上限値を超えていないかを検証する。

### 設定

```yaml
github:
  actions:
    timeout:
      - path: ".github/workflows/**/*.yml"
        max: 30
```

### フィールド

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `path` | string | Yes | 対象 glob |
| `max` | number | Yes | 許容する最大分数 |

### 判定

1. 各 job の `timeout-minutes:` を確認
2. 未設定なら違反
3. `max` を超えていれば違反

reusable workflow 呼び出し（job 直下 `uses:`）は job 内でタイムアウトを制御できないのでスキップする。

---

## 8. actions.concurrency

ワークフロー単位の `concurrency:` 宣言を必須化する。

`concurrency` を宣言しないと、同じ PR への push で冗長なビルドが走ってコスト・ランナー枠を無駄にする。

### 設定

```yaml
github:
  actions:
    concurrency:
      - path: ".github/workflows/**/*.yml"
```

### フィールド

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `path` | string | Yes | 対象 glob |

### 判定

1. workflow トップレベル `concurrency:` キーの存在を確認
2. 未宣言なら違反

---

## 9. actions.consistency

同一アクションが複数ファイルで同じバージョン（ref）に揃っているかを検証する。

`actions/checkout@v4` と `actions/checkout@v3` が混在していると、メンテナンス時に取り残されるリスクがある。

### 設定

```yaml
github:
  actions:
    consistency:
      - path: ".github/workflows/**/*.yml"
        actions: ["actions/checkout", "actions/setup-node"]
```

### フィールド

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `path` | string | Yes | 対象 glob |
| `actions` | string[] | Yes | 一貫性を要求するアクション（`owner/repo` 形式） |

### 判定

1. 対象ファイル群の中で、各指定アクションの `ref`（`@` 以降）を集計
2. 同一アクションで複数の ref が検出されれば全ファイルに違反

### 出力例

```
ERROR [actions.consistency] .github/workflows/test.yml
  actions/checkout のバージョンが一貫していません: @v3, @v4
```

---

## 10. actions.secrets

ワークフロー内の `${{ secrets.X }}` 参照が allowlist 内にあるかを検証する。

タイポや未定義シークレットへの参照を静的に検出する。

### 設定

```yaml
github:
  actions:
    secrets:
      - path: ".github/workflows/**/*.yml"
        allowed: ["NPM_TOKEN", "GITHUB_TOKEN", "SLACK_WEBHOOK"]
```

### フィールド

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `path` | string | Yes | 対象 glob |
| `allowed` | string[] | Yes | 許可するシークレット名 |

### 判定

1. ファイル本文から `${{ secrets.NAME }}` 形式の参照を抽出（正規表現）
2. `allowed` に含まれない名前があれば違反
3. `secrets.GITHUB_TOKEN` と `secrets.github_token` は同一扱い（GitHub が大文字小文字を区別しないため）

---

## 11. actions.danger

ワークフローに含まれる **危険な定型パターン** を検出する。tj-actions/changed-files (CVE-2025-30066) 後に GitHub / OpenSSF が示した Actions ハードニングのうち、以下の 2 点を検査:

1. `pull_request_target` + `actions/checkout` の組み合わせ — フォーク PR から secret が窃取される典型経路
2. `actions/checkout` における `persist-credentials: false` の未指定 — 既定では `GITHUB_TOKEN` が `.git/config` に残留し、後続ステップから読み取れる

### 設定

```yaml
github:
  actions:
    danger:
      - path: ".github/workflows/**/*.yml"
        severity: error
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| `path` | string | Yes | — | 対象 workflow の glob |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |

### 出力例

```
ERROR [actions.danger] .github/workflows/release.yml:publish
  actions/checkout は persist-credentials: false を明示してください (デフォルトでトークンが残留)。

ERROR [actions.danger] .github/workflows/pr.yml:build
  pull_request_target + actions/checkout の組み合わせは危険 (フォーク PR から secret が窃取される経路)。
```

---

## 12. actions.injection

`${{ github.event.*.body }}` などの **信頼できない入力** が `run:` ステップ内に直接埋め込まれていないかを検出する。GitHub の security hardening ガイドが「最も悪用されやすい経路」と明示している script injection 攻撃の検出。

### 検出対象

以下のコンテキストが `run:` 内の `${{ ... }}` で展開されている場合に検出:

- `github.event.issue.title` / `.body`
- `github.event.pull_request.title` / `.body` / `.head.ref` / `.head.label`
- `github.event.comment.body`
- `github.event.review.body` / `review_comment.body`
- `github.event.discussion.title` / `.body`
- `github.event.commits.*.message` / `.author.email` / `.author.name`
- `github.head_ref`

正しい使い方は `env:` 経由で受け渡すこと（脆弱なコンテキストでも `env:` の値はシェル変数として安全に展開される）。

### 設定

```yaml
github:
  actions:
    injection:
      - path: ".github/workflows/**/*.yml"
        severity: error
        # 例外: 専用に sanitize 済みの run: ステップを許容する
        allowed_contexts:
          - "github.event.issue.number"  # number は injection にならない
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| `path` | string | Yes | — | 対象 workflow の glob |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |
| `allowed_contexts` | string[] | No | `[]` | 検査をスキップするコンテキスト式（完全一致） |

### 出力例

```
ERROR [actions.injection] .github/workflows/welcome.yml:greet
  信頼できない入力 github.event.issue.title が run: ステップ内で使われています (script injection の経路)。env: 経由で受け渡してください。
```

### 修正パターン

```yaml
# 危険
- run: echo "Title: ${{ github.event.issue.title }}"

# 安全
- env:
    ISSUE_TITLE: ${{ github.event.issue.title }}
  run: echo "Title: $ISSUE_TITLE"
```

---

## 13. codeowners.ownership

`CODEOWNERS` の `path → owners` 一方向整合を検証する。

「この glob に該当するファイルにはこの owner が必要」という方向のみチェックする。逆方向（「この owner は何を所有すべきか」）は検査しない。

### 設定

```yaml
github:
  codeowners:
    ownership:
      - path: "src/payments/**"
        owners: ["@myorg/payments-team"]
        message: "payments 配下は payments-team のレビュー必須"
```

### フィールド

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `path` | string | Yes | 対象ファイルの glob |
| `owners` | string[] | Yes | 必須オーナー（`@user` / `@org/team`） |
| `message` | string | No | エラーメッセージ |

### 判定

1. `.github/CODEOWNERS` / `CODEOWNERS` / `docs/CODEOWNERS` のいずれかを読む
2. rule の `path` にマッチするファイルを glob で列挙
3. 各ファイルに対して CODEOWNERS の**最後のマッチ**（GitHub の挙動）を取得
4. そのマッチが `owners` をすべて含まなければ違反

---

## 共通出力

```
$ monban github

monban github — GitHub チェック

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
