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
| 1 | `required` | ファイル内の必須テキストパターンの欠落を検出する（`within_lines` で先頭 N 行に限定可） |
| 2 | `forbidden` | ファイル内の禁止テキストパターン・BOM・不可視文字・シークレット・プロンプトインジェクション・マージコンフリクトマーカーを検出する |
| 3 | `size` | ファイルの行数が上限を超えていないか検証する |

---

## 設定

```yaml
# monban.yml
content:
  required:
    - path: "src/**/*.ts"
      pattern: "^// Copyright \\d{4}"
      scope: first_line
      message: "コピーライトヘッダーが必要です。"

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

  size:
    - path: "src/**/*.ts"
      max_lines: 300
      exclude: ["src/generated/**"]
      message: "ファイルが大きすぎます。分割してください。"
```

---

## 1. required

<!-- monban:ref ../src/rules/content/required.ts sha256:98f26028c52b78cfbb147f4687ce354d4ba786c120fae979f593e0e650bda0ef -->

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

    # 生成ファイルは先頭 3 行以内に DO NOT EDIT マーカーを持つべき
    - path: "src/generated/**/*.{ts,go}"
      pattern: "(@generated|DO NOT EDIT)"
      within_lines: 3
      message: "生成ファイルには先頭に DO NOT EDIT マーカーが必要です。"
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象ファイルの glob パターン |
| `exclude` | string[] | No | `[]` | 対象から除外する glob パターン |
| `pattern` | string | Yes | — | 必須の正規表現パターン |
| `scope` | `"file"` \| `"first_line"` \| `"last_line"` | No | `"file"` | マッチ範囲 |
| `within_lines` | integer | No | — | 先頭 N 行に限定してマッチする（`scope` が `"file"` のときのみ指定可） |
| `message` | string | No | — | エラーメッセージ |

`scope: "first_line"` は `within_lines: 1` と同等。複数行のヘッダ（generated マーカーのように `@generated` / `DO NOT EDIT` が先頭 2–3 行のどこかに現れる）を許容したい場合は `within_lines` を使う。

### 出力例

```
ERROR [required] src/billing/invoice.ts
  必須パターンが見つかりません: ^// Copyright \d{4} (first_line)
  コピーライトヘッダーが必要です。

ERROR [required] src/generated/api.ts
  必須パターンが見つかりません: (@generated|DO NOT EDIT) (within first 3 lines)
  生成ファイルには先頭に DO NOT EDIT マーカーが必要です。
```

---

## 2. forbidden

<!-- monban:ref ../src/rules/content/forbidden.ts sha256:662d943a5e611479896d237df99ad00389d527dfee920321c9f0d7f2b8635627 -->

ファイル内にあってはならないものを定義する。テキストパターン、BOM、不可視 Unicode 文字、シークレット、プロンプトインジェクション、マージコンフリクトマーカーの 6 種類を同じルールで扱う。

`pattern`、`bom`、`invisible`、`secret`、`injection`、`conflict` のいずれか 1 つ以上を指定する。

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

    # --- プロンプトインジェクション ---

    - path: "**/*.md"
      injection: true
      message: "AI エージェント向けドキュメントに不審な指示が含まれています。"
    - path: "AGENTS.md"
      injection: true
    - path: ".mcp.json"
      injection: true

    # --- マージコンフリクトマーカー ---

    - path: "**"
      conflict: true
      message: "未解決のマージコンフリクトが残っています。"
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
| `injection` | boolean | No* | — | `true` でプロンプトインジェクション疑いを検出する |
| `conflict` | boolean | No* | — | `true` でマージコンフリクトマーカーを検出する |
| `message` | string | No | — | エラーメッセージ |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |

\* `pattern`、`bom`、`invisible`、`secret`、`injection`、`conflict` のいずれか 1 つ以上が必須。

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

### injection の判定

AI エージェント（Claude / Cursor / Copilot 等）を標的にした間接的プロンプトインジェクションを検出する。`README.md` / `AGENTS.md` / `CLAUDE.md` / `.mcp.json` / PR テンプレートなど、エージェントが読み込むテキストに対して適用する。

検出対象は 3 カテゴリ:

| カテゴリ | 検出内容 |
|---------|---------|
| Unicode Tag ブロック | `U+E0000`–`U+E007F`（正当な用途はほぼなく、インジェクションの隠蔽に悪用される） |
| Bidi 制御文字 | `U+202A`–`U+202E`、`U+2066`–`U+2069`（Trojan Source 攻撃） |
| 指示上書きフレーズ | `ignore previous instructions` / `disregard ... system prompt` / `you are now ...` / `forget everything` / `new system prompt:` 等（大文字小文字無視） |

`invisible` とは検出対象が重ならない（`invisible` は零幅スペース等の正当な用途もある文字、`injection` は攻撃専用の文字列）。両方を有効にしても二重報告にはならない。

### conflict の判定

Git マージコンフリクトの 3 種のマーカーを行頭一致で検出する:

| マーカー | 判定 |
|---------|------|
| `<<<<<<<` | 行頭に 7 文字の `<` |
| `=======` | 行全体が 7 文字の `=`（行の途中にある等号区切りは誤検出しない） |
| `>>>>>>>` | 行頭に 7 文字の `>` |

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

ERROR [forbidden] AGENTS.md:42
  プロンプトインジェクション疑い: 指示上書きフレーズを検出
  AI エージェント向けドキュメントに不審な指示が含まれています。

ERROR [forbidden] src/legacy/module.ts:12
  マージコンフリクトマーカー検出: start marker (<<<<<<<)
  未解決のマージコンフリクトが残っています。
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
