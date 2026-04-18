# monban path

パス構造のチェック。ファイル・ディレクトリの存在、命名、深度、数を検証する。

- 言語非依存・AST 不要
- ファイルシステムの走査（glob / パス解析）のみで完結
- 全ルールのセレクタは `path`（glob パターン）

```bash
monban path                    # 全ルール実行
monban path --rule forbidden   # 特定ルールのみ
monban path --diff=main        # 差分スコープのみ（詳細: ../docs/diff.md）
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

すべてのルールは、トップレベルの `exclude` で指定されたパターンを自動的に除外する。

```yaml
# monban.yml
exclude:
  - "**/node_modules/**"
  - "**/vendor/**"

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

## 1. forbidden

<!-- monban:ref ../src/rules/path/forbidden.ts sha256:bdd98c6a5adaf42b7f267b7d890b7cccd5239c0432295571315e2804b8204401 -->

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

<!-- monban:ref ../src/rules/path/required.ts sha256:2e10a29681c1397b5cdd743858e9ae9dd6a5cfa928df5f4e5174319b22288056 -->

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

<!-- monban:ref ../src/rules/path/naming.ts sha256:9a4e74475934325636616e42cecc118e3ff91ee16cb74ec0db3314c882bd7915 -->

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
      style: snake

    - path: "src/hooks/**/*.ts"
      style: camel
      prefix: "use"

    - path: "src/domain/**/entities/**/*.ts"
      style: pascal
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

`pascal` / `camel` / `kebab` / `snake`

### 出力例

```
ERROR [naming] src/components/user_profile.tsx
  pascal が期待されています。
  現在: user_profile.tsx

ERROR [naming] src/hooks/auth.ts
  prefix "use" が期待されています。
  現在: auth.ts
```

---

## 4. depth

<!-- monban:ref ../src/rules/path/depth.ts sha256:812074426cac3eed081d94078682b47f22a8df4e9bb74bd504b3804a9e9115a3 -->

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

<!-- monban:ref ../src/rules/path/count.ts sha256:9aabef7b9d37ab0b5d6ec473ccb5651c0866fd4a802db86dd04d3dc62bb95747 -->

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
```

### フィールド

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `path` | string | Yes | 対象ディレクトリ |
| `max` | number | Yes | 最大ファイル数 |
| `exclude` | string[] | No | カウント除外パターン |

### 出力例

```
ERROR [count] src/handlers/
  ファイル数 24 が上限 20 を超えています。
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
  ✗ count         1 violation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  4 violations
  3/5 rules passed
```
