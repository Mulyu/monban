# monban content

ファイル内容のチェック。言語非依存の正規表現マッチと行カウントで、ファイルの内容・構造・サイズを検証する。

- 言語非依存・AST 不要
- プレーンテキストの正規表現スキャンと行カウントのみで完結
- セレクタは `path`（glob パターン）で対象ファイルを指定

```bash
monban content                     # 全ルール実行
monban content --rule forbidden    # 特定ルールのみ
monban content --json              # JSON 出力
```

---

## ルール一覧

| # | ルール | 概要 |
|---|--------|------|
| 1 | `forbidden` | ファイル内の禁止テキストパターンを検出する |
| 2 | `required` | ファイル内の必須テキストパターンの欠落を検出する |
| 3 | `max-lines` | ファイルの行数が上限を超えていないか検出する |
| 4 | `max-line-length` | 一行の文字数が上限を超えていないか検出する |
| 5 | `ratio` | 特定パターンに一致する行の比率が基準を満たしているか検出する |
| 6 | `count` | 特定パターンの出現回数が上限・下限を満たしているか検出する |
| 7 | `order` | 特定パターンの出現順序が正しいか検出する |
| 8 | `pair` | 対になるべきパターンの片方が欠落していないか検出する |
| 9 | `encoding` | ファイルのエンコーディングが不正でないか検出する |
| 10 | `line-ending` | 改行コードが統一されているか検出する |

---

## 設定

```yaml
# monban.yml
content:
  forbidden:
    - path: "src/domain/**"
      pattern: "process\\.env"
      message: "domain 層で環境変数に直接アクセスしないでください。"
    - path: "**/*.go"
      pattern: "fmt\\.Println"
      severity: warn

  required:
    - path: "src/**/*.ts"
      pattern: "^// Copyright \\d{4}"
      scope: first_line
      message: "コピーライトヘッダーが必要です。"

  max-lines:
    - path: "src/**/*.ts"
      max: 300
    - path: "**/*.py"
      max: 500

  max-line-length:
    - path: "src/**"
      max: 120
    - path: "**/*.md"
      max: 200

  ratio:
    - path: "src/**/*.ts"
      pattern: "^\\s*(//|/\\*|\\*)"
      min: 0.05
      message: "コメント率が 5% 未満です。"

  count:
    - path: "src/**/*.ts"
      pattern: "export default"
      max: 1
      message: "export default は 1 ファイルにつき 1 つまでです。"

  order:
    - path: "src/**/*.ts"
      patterns:
        - "^// Copyright"
        - "^import "
        - "^export "
      message: "Copyright → import → export の順で記述してください。"

  pair:
    - path: "**/*.sql"
      open: "BEGIN"
      close: "COMMIT|ROLLBACK"
      message: "BEGIN に対応する COMMIT/ROLLBACK がありません。"

  encoding:
    - path: "src/**"
      allow: utf-8
      bom: false

  line-ending:
    - path: "**"
      style: lf
```

---

## 1. forbidden

ファイル内に含まれてはならないテキストパターンを定義する。

AIエージェントはデバッグ出力、環境変数への直接アクセス、本番に不適切なコードを残しがち。正規表現で行単位にマッチする。

### 設定

```yaml
content:
  forbidden:
    # レイヤー制約
    - path: "src/domain/**"
      pattern: "process\\.env"
      message: "domain 層で環境変数に直接アクセスしないでください。"
    - path: "src/domain/**"
      pattern: "console\\.(log|error|warn)"
      message: "domain 層に console 出力を置かないでください。"

    # デバッグコード
    - path: "src/**"
      pattern: "debugger"
    - path: "**/*.py"
      pattern: "^import pdb|pdb\\.set_trace"
    - path: "**/*.go"
      pattern: "fmt\\.Println"
      severity: warn

    # セキュリティ
    - path: "**"
      pattern: "(password|secret|api_key)\\s*=\\s*[\"'][^\"']{8,}"
      severity: warn
      message: "ハードコードされたシークレットの可能性があります。"
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象ファイルの glob パターン |
| `pattern` | string | Yes | — | 禁止する正規表現パターン |
| `message` | string | No | — | エラーメッセージ |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |

### 出力例

```
ERROR [forbidden] src/domain/order/service.ts:15
  禁止パターン検出: process.env
  domain 層で環境変数に直接アクセスしないでください。
```

---

## 2. required

ファイル内に含まれるべきテキストパターンを定義する。

コピーライトヘッダーやライセンス表記など、すべてのファイルに存在すべき定型テキストのチェックに使う。

### 設定

```yaml
content:
  required:
    - path: "src/**/*.ts"
      pattern: "^// Copyright \\d{4}"
      scope: first_line
      message: "コピーライトヘッダーが必要です。"

    - path: "**/*.rb"
      pattern: "^# frozen_string_literal: true"
      scope: first_line

    - path: "packages/*/src/**/*.ts"
      pattern: "@license MIT"
      scope: file
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象ファイルの glob パターン |
| `pattern` | string | Yes | — | 必須の正規表現パターン |
| `scope` | `"file"` \| `"first_line"` \| `"last_line"` | No | `"file"` | マッチ範囲 |
| `message` | string | No | — | エラーメッセージ |

### 出力例

```
ERROR [required] src/billing/invoice.ts
  必須パターンが見つかりません: ^// Copyright \d{4} (first_line)
  コピーライトヘッダーが必要です。
```

---

## 3. max-lines

ファイルの行数に上限を設ける。

AIエージェントは1つのファイルにコードを追加し続け、巨大ファイルを作りがち。旧 `monban size` コマンドの機能を統合。

### 設定

```yaml
content:
  max-lines:
    - path: "src/**/*.ts"
      max: 300

    - path: "**/*.py"
      max: 500

    - path: "**"
      max: 1000
      severity: warn
      exclude:
        - "**/*.generated.*"
        - "**/migrations/**"
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象ファイルの glob パターン |
| `max` | number | Yes | — | 最大行数 |
| `exclude` | string[] | No | — | 除外パターン |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |
| `message` | string | No | — | エラーメッセージ |

### 出力例

```
ERROR [max-lines] src/handlers/payment.ts
  行数 412 が上限 300 を超えています。
```

---

## 4. max-line-length

一行の文字数に上限を設ける。

AIエージェントは長大な一行コード（巨大な JSON リテラル、長いチェーン呼び出し等）を生成しがち。

### 設定

```yaml
content:
  max-line-length:
    - path: "src/**"
      max: 120

    - path: "**/*.md"
      max: 200
      severity: warn
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象ファイルの glob パターン |
| `max` | number | Yes | — | 最大文字数 |
| `exclude` | string[] | No | — | 除外パターン |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |
| `message` | string | No | — | エラーメッセージ |

### 出力例

```
ERROR [max-line-length] src/config/defaults.ts:42
  行の長さ 187 が上限 120 を超えています。
```

---

## 5. ratio

特定パターンに一致する行の比率をチェックする。

旧 `monban comment` の min_ratio 機能を汎用化して統合。コメント率だけでなく、任意のパターンの行比率をチェックできる。ユーザーが `pattern` でコメント行を定義するため、言語非依存。

### 設定

```yaml
content:
  ratio:
    # TypeScript のコメント率
    - path: "src/**/*.ts"
      pattern: "^\\s*(//|/\\*|\\*)"
      min: 0.05
      message: "コメント率が 5% 未満です。"

    # Python のコメント率
    - path: "**/*.py"
      pattern: "^\\s*#"
      min: 0.10

    # 空行が多すぎないか
    - path: "src/**"
      pattern: "^\\s*$"
      max: 0.30
      message: "空行の割合が 30% を超えています。"
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象ファイルの glob パターン |
| `pattern` | string | Yes | — | カウント対象の正規表現パターン |
| `min` | number | No | — | 最低比率（0〜1） |
| `max` | number | No | — | 最大比率（0〜1） |
| `exclude` | string[] | No | — | 除外パターン |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |
| `message` | string | No | — | エラーメッセージ |

\* `min` か `max` の少なくとも一方が必須。

### 出力例

```
ERROR [ratio] src/handlers/payment.ts
  パターン "^\s*(//|/\*|\*)" の比率 0.02 が下限 0.05 を下回っています。
  コメント率が 5% 未満です。
```

---

## 6. count

特定パターンの出現回数に上限・下限を設ける。

AIエージェントは `export default` を複数書いたり、同じパターンを大量に繰り返したりする。

### 設定

```yaml
content:
  count:
    # export default は 1 つまで
    - path: "src/**/*.ts"
      pattern: "export default"
      max: 1
      message: "export default は 1 ファイルにつき 1 つまでです。"

    # TODO は 3 つまで
    - path: "src/**"
      pattern: "TODO"
      max: 3
      severity: warn

    # テストファイルには最低 1 つの it/test
    - path: "tests/**/*.test.ts"
      pattern: "\\b(it|test)\\("
      min: 1
      message: "テストファイルにテストケースがありません。"
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象ファイルの glob パターン |
| `pattern` | string | Yes | — | カウント対象の正規表現パターン |
| `min` | number | No | — | 最小出現回数 |
| `max` | number | No | — | 最大出現回数 |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |
| `message` | string | No | — | エラーメッセージ |

\* `min` か `max` の少なくとも一方が必須。

### 出力例

```
ERROR [count] src/handlers/payment.ts
  パターン "export default" の出現回数 3 が上限 1 を超えています。
  export default は 1 ファイルにつき 1 つまでです。
```

---

## 7. order

特定パターンの出現順序を検証する。

ファイル内の構造的な順序（ヘッダー → インポート → エクスポート等）を強制する。最初にマッチした行の位置で順序を判定する。

### 設定

```yaml
content:
  order:
    - path: "src/**/*.ts"
      patterns:
        - "^// Copyright"
        - "^import "
        - "^export "
      message: "Copyright → import → export の順で記述してください。"

    - path: "**/*.py"
      patterns:
        - "^#!/"
        - "^# -\\*- coding"
        - "^import |^from "
      message: "shebang → encoding → import の順で記述してください。"
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象ファイルの glob パターン |
| `patterns` | string[] | Yes | — | 出現順序を指定する正規表現パターンの配列 |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |
| `message` | string | No | — | エラーメッセージ |

### 判定ロジック

1. 各パターンについてファイル内で**最初にマッチする行番号**を記録
2. マッチしないパターンはスキップ（存在チェックは `required` の責務）
3. マッチした行番号が `patterns` の配列順と一致しない場合に違反

### 出力例

```
ERROR [order] src/handlers/payment.ts
  パターンの順序が不正です: "^export " (行 5) が "^import " (行 12) より前に出現しています。
  Copyright → import → export の順で記述してください。
```

---

## 8. pair

対になるべきパターンが揃っているかを検証する。

片方のパターンが存在するなら、もう片方も同じファイル内に存在しなければならない。

### 設定

```yaml
content:
  pair:
    # SQL トランザクション
    - path: "**/*.sql"
      open: "BEGIN"
      close: "COMMIT|ROLLBACK"
      message: "BEGIN に対応する COMMIT/ROLLBACK がありません。"

    # React useEffect のクリーンアップ
    - path: "src/**/*.tsx"
      open: "addEventListener"
      close: "removeEventListener"
      severity: warn
      message: "addEventListener に対応する removeEventListener がありません。"

    # ファイルのオープン/クローズ
    - path: "**/*.py"
      open: "open\\("
      close: "\\.close\\(\\)"
      severity: warn
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象ファイルの glob パターン |
| `open` | string | Yes | — | 開始パターン（正規表現） |
| `close` | string | Yes | — | 終了パターン（正規表現） |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |
| `message` | string | No | — | エラーメッセージ |

### 判定ロジック

1. ファイル全体で `open` パターンにマッチする行が存在するか確認
2. `open` が存在する場合のみ、`close` パターンの存在を確認
3. `open` がなければチェックしない（`open` の存在を強制するのは `required` の責務）

### 出力例

```
ERROR [pair] db/migrations/002_add_users.sql
  "BEGIN" に対応する "COMMIT|ROLLBACK" が見つかりません。
  BEGIN に対応する COMMIT/ROLLBACK がありません。
```

---

## 9. encoding

ファイルのエンコーディングを検証する。

AIエージェントがバイナリファイルやBOM付きファイルをソースディレクトリに配置することを防ぐ。

### 設定

```yaml
content:
  encoding:
    - path: "src/**"
      allow: utf-8
      bom: false

    - path: "**/*.csv"
      allow: utf-8
      bom: true    # CSV は BOM 付き UTF-8 を許可
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象ファイルの glob パターン |
| `allow` | `"utf-8"` | Yes | — | 許可するエンコーディング |
| `bom` | boolean | No | `false` | BOM の許可 |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |
| `message` | string | No | — | エラーメッセージ |

### 判定ロジック

1. ファイルの先頭バイトで BOM（`0xEF 0xBB 0xBF`）の有無を確認
2. `bom: false` なのに BOM が存在すれば違反
3. `bom: true` なのに BOM が不在なら違反（BOM を要求する場合）
4. バイナリ検出: NUL バイト（`0x00`）が含まれていればバイナリとして報告

### 出力例

```
ERROR [encoding] src/config/defaults.ts
  BOM (Byte Order Mark) が検出されました。BOM なし UTF-8 を使用してください。

ERROR [encoding] src/data/sample.bin
  バイナリファイルが検出されました。ソースディレクトリにバイナリを配置しないでください。
```

---

## 10. line-ending

改行コードの統一を検証する。

プラットフォーム間での改行コードの不一致を検出する。

### 設定

```yaml
content:
  line-ending:
    - path: "**"
      style: lf

    - path: "**/*.bat"
      style: crlf
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象ファイルの glob パターン |
| `style` | `"lf"` \| `"crlf"` | Yes | — | 期待する改行コード |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |
| `message` | string | No | — | エラーメッセージ |

### 判定ロジック

1. ファイルをバイナリモードで読み込み
2. `style: "lf"` の場合: `\r\n` が存在すれば違反
3. `style: "crlf"` の場合: `\r` を含まない `\n` が存在すれば違反

### 出力例

```
ERROR [line-ending] src/utils.ts
  CRLF 改行が検出されました。LF に統一してください。
```

---

## 共通出力

```
$ monban content

monban content — コンテンツチェック

  ✗ forbidden        3 violations
  ✗ required         1 violation
  ✓ max-lines
  ✓ max-line-length
  ✗ ratio            2 violations
  ✓ count
  ✓ order
  ✗ pair             1 violation
  ✓ encoding
  ✓ line-ending

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  7 violations (5 errors, 2 warnings)
  6/10 rules passed
```
