# monban path

> **日本語** | [English](./en/path.md)

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
| 1 | `required` | 存在しなければならないファイルの欠落を検出する |
| 2 | `forbidden` | 存在してはならないパスを検出する |
| 3 | `naming` | ファイル・ディレクトリの命名規則違反を検出する |
| 4 | `depth` | ディレクトリのネスト深度の超過を検出する |
| 5 | `count` | ディレクトリ内のファイル数の上限・下限を検査する |
| 6 | `size` | ファイルサイズ（バイト数）の上限を検査する |
| 7 | `hash` | 単一ファイルを SHA256 で固定する（テンプレート / ベンダ / 生成物の改竄検知） |
| 8 | `case_conflict` | 大文字小文字違いで衝突するファイル名を検出する（macOS/Windows 破壊対策） |

---

## 設定

すべてのルールは、トップレベルの `exclude` で指定されたパターンを自動的に除外する。

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
      message: "utils/ は使用禁止。適切なモジュールに配置してください。"
    - path: "src/**/*.js"
      message: "src/ 内に .js は配置できません。"

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

<!-- monban:ref ../src/rules/path/required.ts sha256:c8830437421369adad6bb499bef67c371685e1f7a0414b7aa917406648a9237b -->

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
    # 同一ディレクトリの随伴ファイル（既定: root 未指定）
    - path: "src/components/**/*.tsx"
      exclude: ["**/*.test.tsx", "**/*.stories.tsx"]
      companions:
        - pattern: "{stem}.test.tsx"
          required: true
        - pattern: "{stem}.stories.tsx"
          required: false    # warn のみ

    # 別ディレクトリの随伴ファイル（root: true でリポジトリルート起点）
    - path: "app/models/**/*.rb"
      companions:
        - pattern: "spec/models/{stem}_spec.rb"
          required: true
          root: true
```

`{stem}` はソースファイルの拡張子を除いた名前に展開される。

パターンの解決方法は `root` フィールドで制御する。

- `root` 未指定（既定）— ソースファイルのディレクトリ起点で解決する。例: `src/components/UserProfile.tsx` に対する `{stem}.test.tsx` は `src/components/UserProfile.test.tsx`
- `root: true` — リポジトリルート起点で解決する。例: `app/models/user.rb` に対する `spec/models/{stem}_spec.rb` は `spec/models/user_spec.rb`

一方向性は保たれる（「ソースがあれば随伴があるべき」の一方向で、逆方向のチェックは行わない）。

### フィールド

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `path` | string | Yes | 対象を選択する glob パターン |
| `exclude` | string[] | No | 除外パターン |
| `files` | string[] | No* | 必須ファイル名（末尾 `/` でディレクトリ） |
| `companions` | CompanionDef[] | No* | ペアファイル定義 |

\* `files` か `companions` のいずれかが必須。

**CompanionDef:**

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `pattern` | string | Yes | — | ペアファイルのパターン（`{stem}` 展開可） |
| `required` | boolean | Yes | — | `true` = error, `false` = warn |
| `root` | boolean | No | `false` | `true` でリポジトリルート起点、`false` でソースファイルのディレクトリ起点 |

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

## 2. forbidden

<!-- monban:ref ../src/rules/path/forbidden.ts sha256:550b88f8a963672c732389404fe13f4d039513e5eff20d980830f80659a24276 -->

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
| `type` | `"file"` \| `"directory"` \| `"symlink"` | No | — | エントリ種別で絞り込む（指定しないと全種別） |
| `message` | string | No | — | エラーメッセージ |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |

`type: symlink` を使うと、リポジトリ内のシンボリックリンク禁止をシンプルに表現できる:

```yaml
path:
  forbidden:
    - path: "**"
      type: symlink
      message: "シンボリックリンクは使用禁止。"
```

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

## 3. naming

<!-- monban:ref ../src/rules/path/naming.ts sha256:940d7a1d664ab9829783bafaa3d880669aa40162c72be4f9ce63bee9ef8d213a -->

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
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |

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

<!-- monban:ref ../src/rules/path/depth.ts sha256:f10e9e5c4c142e578c2a6af296dddede8ab934a3662ce30109c3c0e5a3fa04a9 -->

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

<!-- monban:ref ../src/rules/path/count.ts sha256:6596f61566e4ca8af19628768eb1a744deaeed64b2b5033dde038db0ef7654e4 -->

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
| `max` | number | No* | 最大ファイル数 |
| `min` | number | No* | 最小ファイル数 |
| `exclude` | string[] | No | カウント除外パターン |

\* `max` または `min` のいずれか 1 つ以上が必須。両方指定すれば範囲チェックになる。

### 出力例

```
ERROR [count] src/handlers/
  ファイル数 24 が上限 20 を超えています。

ERROR [count] src/rules/
  ファイル数 0 が下限 1 を下回っています。
```

---

## 6. size

<!-- monban:ref ../src/rules/path/size.ts sha256:f54d72a23a1edde734b5f895d3caee71f8ca7f940706244da9cde15ae7f058ee -->

ファイルサイズ（バイト数）の上限を検査する。`content.size` が行数を見るのに対し、こちらはバイナリ・画像・バンドル成果物などを対象にできる。

### 設定

```yaml
path:
  size:
    # 画像アセットの肥大化を防ぐ
    - path: "assets/**/*.{png,jpg,gif}"
      max_bytes: 102400  # 100 KiB
      severity: warn

    # 設定ファイルが暴走的に肥大化していないかを担保
    - path: "config/**/*.json"
      max_bytes: 10240   # 10 KiB
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象ファイルの glob |
| `exclude` | string[] | No | — | 除外 glob |
| `max_bytes` | integer | Yes | — | バイト数の上限 |
| `message` | string | No | — | カスタムメッセージ |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |

### 出力例

```
WARN  [size] assets/banner.png
  サイズ 412.3 KiB が上限 100.0 KiB を超えています。
```

---

## 7. hash

<!-- monban:ref ../src/rules/path/hash.ts sha256:5427e3c0b0222579544c2d206c19d781c4774a535d8740014af9240e1563b7c3 -->

単一ファイルの SHA256 を固定する。LICENSE のテンプレ、ベンダ済みファイル、生成成果物の改竄を検出する。

`doc.ref`（A の中に B のハッシュが埋め込まれている cross-file 照合）とは別概念で、こちらは「特定のファイルそのものが既知のバイト列であるか」を見る。

### 設定

```yaml
path:
  hash:
    # 組織共通の LICENSE をピン留め
    - path: "LICENSE"
      sha256: "f288702d2fa16d3cdf0035b15a9eecc3866f4ddc5c1f6f5a2f8c8b4a0c1f4..."
      message: "LICENSE は組織共通テンプレを使ってください。"

    # ベンダ済みスクリプトの改竄検知
    - path: "vendor/setup.sh"
      sha256: "8a2c..."
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象ファイルの glob（通常は単一ファイルを指す） |
| `sha256` | string (64桁hex) | Yes | — | 期待する SHA256 |
| `message` | string | No | — | カスタムメッセージ |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |

### 出力例

```
ERROR [hash] LICENSE
  ハッシュ不一致: expected f288702d2fa1... actual 9b5fe22e4730...
  LICENSE は組織共通テンプレを使ってください。
```

---

## 8. case_conflict

<!-- monban:ref ../src/rules/path/case-conflict.ts sha256:0f66bf1e1692fc004b5db2bd206df0714e54cef8b351ad4ea0fbc18c59db71c5 -->

同一ディレクトリ内で大文字小文字違いのみで衝突するファイル名を検出する。case-insensitive ファイルシステム（macOS / Windows）でリポジトリを開いたときに片方が消えるバグを防ぐ。

### 設定

```yaml
path:
  case_conflict:
    - path: "**/*"
      exclude: ["node_modules/**"]
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象ファイル / ディレクトリの glob |
| `exclude` | string[] | No | — | 除外 glob |
| `message` | string | No | — | カスタムメッセージ |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |

### 出力例

```
ERROR [case_conflict] src/{Foo.ts, foo.ts}
  大文字小文字違いで衝突するパス: Foo.ts, foo.ts
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
