# monban path

パス構造のチェック。ファイル・ディレクトリの存在、命名、深度、数を検証する。

- 言語非依存・AST 不要
- ファイルシステムの走査（glob / パス解析）のみで完結
- 全ルールのセレクタは `path`（glob パターン）

```bash
monban path                    # 全ルール実行
monban path --rule forbidden   # 特定ルールのみ
monban path --json             # JSON 出力
```

---

## ルール一覧

| # | ルール | 概要 |
|---|--------|------|
| 1 | `forbidden` | 存在してはならないパスを検出する |
| 2 | `required` | 存在しなければならないファイルの欠落を検出する |
| 3 | `naming` | ファイル・ディレクトリの命名規則違反を検出する |
| 4 | `depth` | ディレクトリのネスト深度の超過を検出する |
| 5 | `count` | ディレクトリ内のファイル数の超過を検出する |

---

## 設定

```yaml
# monban.yml
path:
  forbidden:
    - path: "**/utils/**"
      message: "utils/ は使用禁止。適切なモジュールに配置してください。"
    - path: "src/**/*.js"
      message: "src/ 内に .js は配置できません。"

  required:
    - path: "src/handlers/*"
      files: ["index.ts", "schema.ts"]
    - path: "src/components/**/*.tsx"
      exclude: ["**/*.test.tsx"]
      companions: ["{stem}.test.tsx"]

  naming:
    - path: "src/components/**/*.tsx"
      style: PascalCase
    - path: "src/**/"
      target: directory
      style: kebab-case

  depth:
    - path: "src"
      max: 4

  count:
    - path: "src/handlers"
      max: 20
```

---

## 1. forbidden

存在してはならないファイル・ディレクトリを定義する。

AIエージェントは `utils/`、`helpers/` のような曖昧なディレクトリを安易に作る。拡張子の制限やトップレベル構造の制御にも使える。

### 設定

```yaml
path:
  forbidden:
    # ディレクトリ禁止
    - path: "**/utils/**"
      message: "utils/ は使用禁止。適切なモジュールに配置してください。"
    - path: "**/helpers/**"
      message: "helpers/ は使用禁止。"

    # 拡張子禁止
    - path: "src/**/*.js"
      message: "src/ 内に .js は配置できません。"

    # 一時ファイル
    - path: "**/*.temp.*"
      severity: warn
      message: "一時ファイルをコミットしないでください。"

    # トップレベル構造の制御
    - path: "src/!(domain|application|infrastructure|presentation)/"
      message: "src/ 直下に未定義のディレクトリを作成しないでください。"
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 禁止する glob パターン |
| `message` | string | No | — | エラーメッセージ |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |

### 出力例

```
ERROR [forbidden] src/utils/format.ts
  utils/ は使用禁止。適切なモジュールに配置してください。

ERROR [forbidden] src/legacy/handler.js
  src/ 内に .js は配置できません。

WARN  [forbidden] tmp/draft.temp.md
  一時ファイルをコミットしないでください。
```

---

## 2. required

特定のディレクトリやファイルに対し、存在すべきファイルを定義する。2つのモードがある。

- **files** — ディレクトリに必須のファイルを定義する
- **companions** — ソースファイルに対するペアファイルを定義する

### 設定: files モード

ディレクトリが存在するとき、その中に必ず含まれるべきファイルを指定する。

```yaml
path:
  required:
    # ディレクトリに必須ファイル
    - path: "src/handlers/*"
      files:
        - "index.ts"
        - "schema.ts"

    - path: "packages/*"
      files:
        - "package.json"
        - "README.md"

    # 必須ディレクトリ（末尾 / でディレクトリ指定）
    - path: "src"
      files:
        - "domain/"
        - "application/"
        - "infrastructure/"
```

### 設定: companions モード

ファイルが存在するとき、対応するペアファイルが存在すべきことを指定する。

```yaml
path:
  required:
    - path: "src/components/**/*.tsx"
      exclude: ["**/*.test.tsx", "**/*.stories.tsx"]
      companions:
        - pattern: "{stem}.test.tsx"
          required: true
        - pattern: "{stem}.stories.tsx"
          required: false    # warn のみ

    - path: "app/models/**/*.rb"
      companions:
        - pattern: "spec/models/{stem}_spec.rb"
          required: true
```

`{stem}` はソースファイルの拡張子を除いた名前に展開される。

### フィールド

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `path` | string | Yes | 対象を選択する glob パターン |
| `exclude` | string[] | No | 除外パターン |
| `files` | string[] | No* | 必須ファイル名（末尾 `/` でディレクトリ） |
| `companions` | CompanionDef[] | No* | ペアファイル定義 |

\* `files` か `companions` のいずれかが必須。

**CompanionDef:**

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `pattern` | string | Yes | ペアファイルのパターン（`{stem}` 展開可） |
| `required` | boolean | Yes | `true` = error, `false` = warn |

### 出力例

```
ERROR [required] src/handlers/invoice/
  必須ファイルが見つかりません: schema.ts

ERROR [required] src/components/UserProfile.tsx
  対応ファイルが見つかりません: UserProfile.test.tsx

WARN  [required] src/components/UserProfile.tsx
  対応ファイルが見つかりません: UserProfile.stories.tsx
```

---

## 3. naming

ファイル名・ディレクトリ名の命名スタイルを強制する。場所を起点として、そこにあるファイル/ディレクトリの名前をチェックする。

AIエージェントは既存の命名規則を把握せずにファイルを作成し、PascalCase と kebab-case が混在するなどの不一致を起こす。

### 設定

```yaml
path:
  naming:
    - path: "src/components/**/*.tsx"
      style: PascalCase

    - path: "src/**/"
      target: directory
      style: kebab-case

    - path: "app/models/**/*.rb"
      style: snake_case

    - path: "src/hooks/**/*.ts"
      style: camelCase
      prefix: "use"

    - path: "src/domain/**/entities/**/*.ts"
      style: PascalCase
      suffix: ".entity"
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象パスの glob パターン |
| `target` | `"file"` \| `"directory"` | No | `"file"` | チェック対象 |
| `style` | NamingStyle | Yes | — | 命名スタイル |
| `prefix` | string | No | — | 必須プレフィックス |
| `suffix` | string | No | — | 必須サフィックス（拡張子を除いた部分に対して） |

**NamingStyle:**

`PascalCase` / `camelCase` / `kebab-case` / `snake_case` / `SCREAMING_SNAKE_CASE`

### 出力例

```
ERROR [naming] src/components/user_profile.tsx
  PascalCase が期待されています。
  現在: user_profile.tsx

ERROR [naming] src/hooks/auth.ts
  prefix "use" が期待されています。
  現在: auth.ts
```

---

## 4. depth

ディレクトリのネスト深度に上限を設ける。

AIエージェントは機械的にサブディレクトリを掘り、不必要に深い構造を作ることがある。

### 設定

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

### フィールド

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `path` | string | Yes | 基準ディレクトリ |
| `max` | number | Yes | path からの最大深度 |
| `exclude` | string[] | No | 除外パターン（ルールセット全体で共有） |

### 出力例

```
ERROR [depth] src/domain/user/profile/settings/theme.ts
  深度 5 は上限 4 を超えています (基準: src/)
```

---

## 5. count

1ディレクトリに置けるファイル数に上限を設ける。

AIエージェントは責務を分割せず、1ディレクトリにファイルを大量に生成しがち。

### 設定

```yaml
path:
  count:
    - path: "src/handlers"
      max: 20

    - path: "src/components"
      max: 30
      exclude: ["index.ts"]

    warn_ratio: 0.8
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象ディレクトリ |
| `max` | number | Yes | — | 最大ファイル数 |
| `exclude` | string[] | No | — | カウント除外パターン |
| `warn_ratio` | number | No | `0.8` | 上限に対する warn 閾値（ルールセット全体で共有） |

### 出力例

```
ERROR [count] src/handlers/
  ファイル数 24 が上限 20 を超えています。

WARN  [count] src/components/
  ファイル数 25 / 上限 30（83%）
```

---

## 共通出力

```
$ monban path

monban path — パスチェック

  ✗ forbidden     2 violations
  ✓ required
  ✗ naming        1 violation
  ✓ depth
  ✗ count         1 violation (warn)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  4 violations (3 errors, 1 warning)
  3/5 rules passed
```
