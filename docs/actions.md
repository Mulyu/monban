# monban actions

GitHub Actions ワークフローのチェック。アクションのピン留め、必須ワークフロー・ステップ、禁止アクションを検証する。

- YAML パースのみで完結
- セレクタは `path`（glob パターン）で対象ワークフローファイルを指定

```bash
monban actions                     # 全ルール実行
monban actions --rule pinned       # 特定ルールのみ
monban actions --json              # JSON 出力
```

---

## ルール一覧

| # | ルール | 概要 |
|---|--------|------|
| 1 | `pinned` | `uses` のアクション指定がコミットハッシュで固定されているかを検証する |
| 2 | `required` | 必須ワークフロー・必須ステップの存在を検証する |
| 3 | `forbidden` | 禁止アクションの使用を検出する |

---

## 設定

```yaml
# monban.yml
actions:
  pinned:
    - path: ".github/workflows/**/*.yml"

  required:
    # ワークフロー存在チェック
    - file: ".github/workflows/test.yml"
    - file: ".github/workflows/lint.yml"

    # ステップ存在チェック
    - path: ".github/workflows/test.yml"
      steps: ["actions/checkout", "actions/setup-node"]

  forbidden:
    - path: ".github/workflows/**/*.yml"
      uses: "actions/create-release"
      message: "release-please を使ってください。"
    - path: ".github/workflows/**/*.yml"
      uses: "peter-evans/create-pull-request"
      message: "gh CLI を使ってください。"
```

---

## 1. pinned

`uses` で指定されたアクションがコミットハッシュで固定されているかを検証する。

コーディングエージェントは `@v4` や `@latest` のようなタグ指定でアクションを記述しがち。タグは可変であり、サプライチェーン攻撃のリスクがある。

### 設定

```yaml
actions:
  pinned:
    - path: ".github/workflows/**/*.yml"
```

### フィールド

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `path` | string | Yes | 対象ワークフローファイルの glob パターン |

### 判定

1. 対象の YAML ファイルをパースし、全ステップの `uses` を抽出
2. `uses` の `@` 以降が 40 文字の 16 進数（コミットハッシュ）であるかを検証
3. ローカルアクション（`./` で始まる）と Docker アクション（`docker://` で始まる）はスキップ

### 出力例

```
ERROR [pinned] .github/workflows/test.yml
  ハッシュ固定されていません: actions/checkout@v4
  uses にはコミットハッシュを指定してください。
```

---

## 2. required

必須ワークフローファイルの存在と、ワークフロー内の必須ステップを検証する。2 つのモードがある。

- **file** — ワークフローファイルの存在チェック
- **steps** — ワークフロー内に必須ステップが含まれているかのチェック

### 設定: file モード

```yaml
actions:
  required:
    - file: ".github/workflows/test.yml"
    - file: ".github/workflows/lint.yml"
    - file: ".github/workflows/deploy.yml"
```

### 設定: steps モード

```yaml
actions:
  required:
    - path: ".github/workflows/test.yml"
      steps:
        - "actions/checkout"
        - "actions/setup-node"

    - path: ".github/workflows/deploy.yml"
      steps:
        - "actions/checkout"
```

### フィールド

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `file` | string | No* | 必須ワークフローファイルのパス |
| `path` | string | No* | 対象ワークフローファイルのパス |
| `steps` | string[] | No | 必須ステップ（`uses` の前方一致で判定） |

\* `file` か `path` + `steps` のいずれかが必須。

### file モードの判定

1. 指定されたファイルパスが存在するかを確認
2. 存在しなければ違反

### steps モードの判定

1. 対象の YAML ファイルをパースし、全ジョブの全ステップの `uses` を抽出
2. 各必須ステップについて、前方一致するステップが 1 つ以上あるかを検証
3. 見つからなければ違反

### 出力例

```
ERROR [required] .github/workflows/lint.yml
  必須ワークフローが見つかりません。

ERROR [required] .github/workflows/test.yml
  必須ステップが見つかりません: actions/setup-node
```

---

## 3. forbidden

使用を禁止するアクションを定義する。

非推奨アクションや組織で許可されていないアクションの使用を防ぐ。コーディングエージェントは検索結果から古い・非公認のアクションを採用しがち。

### 設定

```yaml
actions:
  forbidden:
    - path: ".github/workflows/**/*.yml"
      uses: "actions/create-release"
      message: "release-please を使ってください。"

    - path: ".github/workflows/**/*.yml"
      uses: "peter-evans/create-pull-request"
      message: "gh CLI を使ってください。"

    - path: ".github/workflows/**/*.yml"
      uses: "actions/upload-artifact@v3"
      message: "v4 以上を使ってください。"
      severity: warn
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象ワークフローファイルの glob パターン |
| `uses` | string | Yes | — | 禁止するアクション（前方一致） |
| `message` | string | No | — | エラーメッセージ |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |

### 判定

1. 対象の YAML ファイルをパースし、全ステップの `uses` を抽出
2. 各ステップの `uses` が禁止パターンに前方一致するかを検証
3. 一致すれば違反

### 出力例

```
ERROR [forbidden] .github/workflows/release.yml
  禁止アクション検出: actions/create-release@v1
  release-please を使ってください。

WARN  [forbidden] .github/workflows/ci.yml
  禁止アクション検出: actions/upload-artifact@v3
  v4 以上を使ってください。
```

---

## 共通出力

```
$ monban actions

monban actions — GitHub Actions チェック

  ✗ pinned       2 violations
  ✗ required     1 violation
  ✓ forbidden

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  3 violations (3 errors)
  1/3 rules passed
```
