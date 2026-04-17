# monban content

ファイル内容のチェック。言語非依存の正規表現マッチで、禁止パターン・必須パターン・エンコーディングを検証する。

- 言語非依存・AST 不要
- プレーンテキストの正規表現スキャンのみで完結
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
| 3 | `encoding` | ファイルのエンコーディングが不正でないか検出する |

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

  encoding:
    - path: "src/**"
      allow: utf-8
      bom: false
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

## 3. encoding

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

## 共通出力

```
$ monban content

monban content — コンテンツチェック

  ✗ forbidden     3 violations
  ✗ required      1 violation
  ✓ encoding

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  4 violations (3 errors, 1 warning)
  1/3 rules passed
```
