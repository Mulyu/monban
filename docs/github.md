# monban github

GitHub 特有ファイル（ワークフロー・CODEOWNERS）の構造チェック。YAML パースと独自構文パースに特化する。

- ワークフロー: `.github/workflows/**/*.yml` を YAML としてパース
- CODEOWNERS: `.github/CODEOWNERS` / `CODEOWNERS` / `docs/CODEOWNERS` を独自構文でパース
- セレクタは `path`（glob パターン）

```bash
monban github                     # 全ルール実行
monban github --rule pinned       # 特定ルールのみ
monban github --json              # JSON 出力
```

GitHub 関連でも、構造パースが不要なもの（`LICENSE` / `SECURITY.md` の存在、PR テンプレートの必須セクション、`continue-on-error: true` 禁止 など）は `path.required` / `content.required` / `content.forbidden` で表現し、`github` に取り込まない。

---

## ルール一覧

| # | ルール | 対象 | 概要 |
|---|--------|------|------|
| 1 | `pinned` | workflows | `uses` のアクション・reusable workflow・docker image のピン留め |
| 2 | `required` | workflows | 必須ワークフロー・必須ステップ |
| 3 | `forbidden` | workflows | 禁止アクション |
| 4 | `permissions` | workflows | `permissions:` の宣言必須・禁止スカラー値 |
| 5 | `triggers` | workflows | `on:` イベントの allow / deny |
| 6 | `runner` | workflows | `runs-on:` の allowlist |
| 7 | `timeout` | workflows | job に `timeout-minutes:` 必須・上限 |
| 8 | `concurrency` | workflows | `concurrency:` 宣言必須 |
| 9 | `consistency` | workflows | 同一アクションのバージョン一貫性 |
| 10 | `secrets` | workflows | `${{ secrets.X }}` 参照の allowlist |
| 11 | `codeowners` | CODEOWNERS | path → owners の一方向整合 |

---

## 設定

```yaml
# monban.yml
github:
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
      forbid: ["write-all"]

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
    - path: "src/payments/**"
      owners: ["@myorg/payments-team"]
      message: "payments 配下は payments-team のレビュー必須"
```

---

## 1. pinned

`uses` で指定された参照がコミットハッシュで固定されているかを検証する。

タグ（`@v4`、`@main` など）は可変でありサプライチェーン攻撃のリスクがある。

### 設定

```yaml
github:
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
ERROR [pinned] .github/workflows/test.yml
  ハッシュ固定されていません: actions/checkout@v4
```

---

## 2. required

必須ワークフローファイルの存在と、ワークフロー内の必須ステップを検証する。

### 設定

```yaml
github:
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
ERROR [required] .github/workflows/lint.yml
  必須ワークフローが見つかりません。
```

---

## 3. forbidden

使用を禁止するアクションを検出する。

### 設定

```yaml
github:
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

## 4. permissions

ワークフローの `permissions:` 宣言を検証する。GitHub は `permissions:` 未宣言時に `GITHUB_TOKEN` へ広い権限を与えるため、明示宣言が望ましい。

### 設定

```yaml
github:
  permissions:
    - path: ".github/workflows/**/*.yml"
      required: true              # 宣言必須（デフォルト true）
      forbid: ["write-all"]       # 禁止する権限スカラー値
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象 glob |
| `required` | boolean | No | `true` | `permissions:` の宣言を必須にするか |
| `forbid` | string[] | No | `[]` | 禁止するスカラー値（`write-all` / `read-all` など） |

### 判定

1. `required: true` の場合、workflow トップレベル `permissions:` キーの存在を確認
2. workflow トップレベル・各 job の `permissions:` がスカラー値で `forbid` に含まれる場合は違反

### 出力例

```
ERROR [permissions] .github/workflows/release.yml
  permissions: が宣言されていません。
ERROR [permissions] .github/workflows/ci.yml
  禁止された permissions スカラー: write-all
```

---

## 5. triggers

ワークフローの `on:` イベントを検証する。

`pull_request_target` のような危険なトリガーの混入、手動実行（`workflow_dispatch`）の必須化などに用いる。

### 設定

```yaml
github:
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

## 6. runner

job の `runs-on:` の allowlist を検証する。

コストやセキュリティの観点で、特定のランナー（`self-hosted`、`macos-*`）を制限したいケースに使う。

### 設定

```yaml
github:
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

## 7. timeout

全 job に `timeout-minutes:` が設定されているか、かつ上限値を超えていないかを検証する。

### 設定

```yaml
github:
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

## 8. concurrency

ワークフロー単位の `concurrency:` 宣言を必須化する。

`concurrency` を宣言しないと、同じ PR への push で冗長なビルドが走ってコスト・ランナー枠を無駄にする。

### 設定

```yaml
github:
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

## 9. consistency

同一アクションが複数ファイルで同じバージョン（ref）に揃っているかを検証する。

`actions/checkout@v4` と `actions/checkout@v3` が混在していると、メンテナンス時に取り残されるリスクがある。

### 設定

```yaml
github:
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
ERROR [consistency] .github/workflows/test.yml
  actions/checkout のバージョンが一貫していません: @v3, @v4
```

---

## 10. secrets

ワークフロー内の `${{ secrets.X }}` 参照が allowlist 内にあるかを検証する。

タイポや未定義シークレットへの参照を静的に検出する。

### 設定

```yaml
github:
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

## 11. codeowners

`CODEOWNERS` の `path → owners` 一方向整合を検証する。

「この glob に該当するファイルにはこの owner が必要」という方向のみチェックする。逆方向（「この owner は何を所有すべきか」）は検査しない。

### 設定

```yaml
github:
  codeowners:
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

  ✗ pinned         2 violations
  ✓ required
  ✗ permissions    1 violation
  ✓ triggers
  ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  3 violations (3 errors)
  9/11 rules passed
```
