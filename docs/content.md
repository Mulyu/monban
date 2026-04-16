# monban content

ファイル内容のチェック。言語非依存の正規表現マッチで、禁止パターン・必須パターンを検証する。

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
      message: "本番コードに fmt.Println を残さないでください。"

  required:
    - path: "src/**/*.ts"
      pattern: "^// Copyright \\d{4}"
      scope: first_line
      message: "すべてのファイルにコピーライトヘッダーが必要です。"
```

---

## 1. forbidden

ファイル内に含まれてはならないテキストパターンを定義する。

AIエージェントはデバッグ出力、環境変数への直接アクセス、本番に不適切なコードを残しがち。言語固有の構文解析は行わず、正規表現で行単位にマッチする。

### 設定

```yaml
content:
  forbidden:
    # domain 層の制限
    - path: "src/domain/**"
      pattern: "process\\.env"
      message: "domain 層で環境変数に直接アクセスしないでください。"
    - path: "src/domain/**"
      pattern: "console\\.(log|error|warn)"
      message: "domain 層に console 出力を置かないでください。"

    # デバッグコードの残存
    - path: "src/**"
      pattern: "debugger"
      message: "debugger 文を残さないでください。"
    - path: "**/*.go"
      pattern: "fmt\\.Println"
      severity: warn
      message: "本番コードに fmt.Println を残さないでください。"
    - path: "**/*.py"
      pattern: "^import pdb|pdb\\.set_trace"
      message: "pdb を残さないでください。"

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

WARN  [forbidden] internal/handler/user.go:42
  禁止パターン検出: fmt.Println
  本番コードに fmt.Println を残さないでください。
```

---

## 2. required

ファイル内に含まれるべきテキストパターンを定義する。

コピーライトヘッダーやライセンス表記など、すべてのファイルに存在すべき定型テキストのチェックに使う。

### 設定

```yaml
content:
  required:
    # コピーライトヘッダー
    - path: "src/**/*.ts"
      pattern: "^// Copyright \\d{4}"
      scope: first_line
      message: "すべてのファイルにコピーライトヘッダーが必要です。"

    # ライセンス表記
    - path: "packages/*/src/**/*.ts"
      pattern: "@license MIT"
      scope: file
      message: "ライセンス表記が必要です。"

    # frozen_string_literal（Ruby）
    - path: "**/*.rb"
      pattern: "^# frozen_string_literal: true"
      scope: first_line
      message: "frozen_string_literal コメントが必要です。"
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
  必須パターンが見つかりません: ^// Copyright \d{4} (先頭行)
  すべてのファイルにコピーライトヘッダーが必要です。

ERROR [required] app/models/user.rb
  必須パターンが見つかりません: ^# frozen_string_literal: true (先頭行)
  frozen_string_literal コメントが必要です。
```

---

## 共通出力

```
$ monban content

monban content — コンテンツチェック

  ✗ forbidden     3 violations
  ✗ required      1 violation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  4 violations (3 errors, 1 warning)
  0/2 rules passed
```
