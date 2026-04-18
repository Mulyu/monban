# monban content

ファイル内容のチェック。言語非依存の正規表現マッチで、禁止パターン・必須パターンを検証する。

- 言語非依存・AST 不要
- プレーンテキストの正規表現スキャンのみで完結
- セレクタは `path`（glob パターン）で対象ファイルを指定

```bash
monban content                     # 全ルール実行
monban content --rule forbidden    # 特定ルールのみ
monban content --diff=main         # 差分スコープのみ（詳細: ./diff.md）
monban content --json              # JSON 出力
```

---

## ルール一覧

| # | ルール | 概要 |
|---|--------|------|
| 1 | `forbidden` | ファイル内の禁止テキストパターン・BOM・不可視文字・シークレットを検出する |
| 2 | `required` | ファイル内の必須テキストパターンの欠落を検出する |
| 3 | `size` | ファイルの行数が上限を超えていないか検証する |

---

## 設定

```yaml
# monban.yml
content:
  forbidden:
    - path: "src/domain/**"
      pattern: "process\\.env"
      message: "domain 層で環境変数に直接アクセスしないでください。"

    - path: "src/**"
      bom: true
      message: "BOM を含めないでください。"

    - path: "src/**"
      invisible: true
      message: "不可視の Unicode 文字が含まれています。"

  required:
    - path: "src/**/*.ts"
      pattern: "^// Copyright \\d{4}"
      scope: first_line
      message: "コピーライトヘッダーが必要です。"

  size:
    - path: "src/**/*.ts"
      max_lines: 300
      exclude: ["src/generated/**"]
      message: "ファイルが大きすぎます。分割してください。"
```

---

## 1. forbidden

<!-- monban:ref ../src/rules/content/forbidden.ts sha256:85467c7d8acf9e12ec2c082e0cdeeb58f8faa9e6c926ebba82f4a8939f08048a -->

ファイル内にあってはならないものを定義する。テキストパターン、BOM、不可視 Unicode 文字、シークレットの 4 種類を同じルールで扱う。

`pattern`、`bom`、`invisible`、`secret` のいずれか 1 つ以上を指定する。

### 設定

```yaml
content:
  forbidden:
    # --- テキストパターン ---

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

    # --- BOM ---

    - path: "src/**"
      bom: true
      message: "BOM を含めないでください。"

    # --- 不可視 Unicode 文字 ---

    - path: "src/**"
      invisible: true
      message: "不可視の Unicode 文字が含まれています。"

    # --- シークレット ---

    - path: "src/**"
      secret: true
      message: "シークレットらしき文字列が検出されました。"
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象ファイルの glob パターン |
| `exclude` | string[] | No | `[]` | 対象から除外する glob パターン（特定ディレクトリだけ例外扱いに使う） |
| `pattern` | string | No* | — | 禁止する正規表現パターン（行単位マッチ） |
| `bom` | boolean | No* | — | `true` で BOM の存在を禁止する |
| `invisible` | boolean | No* | — | `true` で不可視 Unicode 文字の存在を禁止する |
| `secret` | boolean | No* | — | `true` で既知シークレット形式の存在を禁止する |
| `message` | string | No | — | エラーメッセージ |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |

\* `pattern`、`bom`、`invisible`、`secret` のいずれか 1 つ以上が必須。

### pattern の判定

1. 対象ファイルを行単位で読み込み
2. 各行に対して `new RegExp(pattern)` でマッチ
3. マッチした行を違反として報告（行番号付き）

### bom の判定

1. ファイルの先頭 3 バイトを読み込み
2. UTF-8 BOM（`0xEF 0xBB 0xBF`）が存在すれば違反

### invisible の判定

以下のカテゴリの文字が存在すれば違反として報告する:

| 文字 | コードポイント | 名前 |
|------|--------------|------|
| ​ | `U+200B` | Zero Width Space |
| ‌ | `U+200C` | Zero Width Non-Joiner |
| ‍ | `U+200D` | Zero Width Joiner |
| ⁠ | `U+2060` | Word Joiner |
| ­ | `U+00AD` | Soft Hyphen |
| ﻿ | `U+FEFF` | Zero Width No-Break Space（行中） |
| ⁡ | `U+2061` | Function Application |
| ⁢ | `U+2062` | Invisible Times |
| ⁣ | `U+2063` | Invisible Separator |
| ⁤ | `U+2064` | Invisible Plus |

### secret の判定

既知のシークレット形式を行単位で正規表現マッチする。組み込みのデテクタは以下:

| 検出器 | 対象 |
|--------|------|
| AWS Access Key ID | `AKIA` で始まる 20 文字の英数字 |
| GitHub Personal Access Token | `ghp_` + 36 文字 |
| GitHub OAuth Token | `gho_` + 36 文字 |
| GitHub App Token | `ghu_` / `ghs_` + 36 文字 |
| GitHub Refresh Token | `ghr_` + 36 文字 |
| Google API Key | `AIza` + 35 文字 |
| Slack Token | `xoxb-` / `xoxa-` / `xoxp-` / `xoxr-` / `xoxs-` |
| Stripe Live Key | `sk_live_` / `pk_live_` / `rk_live_` + 24 文字以上 |
| NPM Token | `npm_` + 36 文字 |
| JWT | `eyJ...eyJ...<signature>` 形式の 3 セクション構造 |
| Private Key Block | `-----BEGIN (RSA\|OPENSSH\|DSA\|EC\|PGP) PRIVATE KEY-----` |

誤検出を避けるため、エントロピー解析ではなく既知形式のみを対象とする。

### 出力例

```
ERROR [forbidden] src/domain/order/service.ts:15
  禁止パターン検出: process.env
  domain 層で環境変数に直接アクセスしないでください。

ERROR [forbidden] src/config/defaults.ts
  BOM (Byte Order Mark) が検出されました。
  BOM を含めないでください。

ERROR [forbidden] src/handlers/payment.ts:42
  不可視の Unicode 文字が検出されました: U+200B (Zero Width Space)
  不可視の Unicode 文字が含まれています。

ERROR [forbidden] src/handlers/webhook.ts:8
  シークレット検出: AWS Access Key ID
  シークレットらしき文字列が検出されました。
```

---

## 2. required

<!-- monban:ref ../src/rules/content/required.ts sha256:e5daebfd3ef7f79513c5bc6df66704aa945e309698593e29b3901963555197e9 -->

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
| `exclude` | string[] | No | `[]` | 対象から除外する glob パターン |
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

## 3. size

<!-- monban:ref ../src/rules/content/size.ts sha256:0c136a6bcc0a68958ef21e1ddebd9af9893c8e02c823b6ac6ff71ba5cb3db5b4 -->

ファイルの行数（line count）が閾値以内に収まっているかを検証する。AIエージェントは 1 ファイルに機能を詰め込みがちで、可読性や責務分割の観点で肥大化を検出したい場面がある。

### 設定

```yaml
content:
  size:
    - path: "src/**/*.ts"
      max_lines: 300
      exclude: ["src/generated/**"]
      message: "ファイルが大きすぎます。分割してください。"

    - path: "src/rules/**/*.ts"
      max_lines: 150   # ルール単位では小さく保つ
      severity: warn
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象ファイルの glob パターン |
| `exclude` | string[] | No | `[]` | 対象から除外する glob パターン |
| `max_lines` | integer | Yes | — | 許容する最大行数（この値を超えると違反） |
| `message` | string | No | — | エラーメッセージ |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |

### 判定方法

1. 対象ファイルを読み込む
2. 行数をカウント（末尾の空行は除外）
3. `max_lines` を超えていれば違反として報告

### 出力例

```
ERROR [size] src/cli.ts
  行数 412 が上限 300 を超えています。
  ファイルが大きすぎます。分割してください。
```

---

## 共通出力

```
$ monban content

monban content — コンテンツチェック

  ✗ forbidden     5 violations
  ✗ required      1 violation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  6 violations (5 errors, 1 warning)
  0/2 rules passed
```
