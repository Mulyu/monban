# monban license

> **日本語** | [English](./license.md)

LICENSE ファイルとソースファイルヘッダのライセンス識別子検査。

エージェントが新規ファイルを追加するときに `SPDX-License-Identifier:` ヘッダを忘れる、許容しないライセンスの LICENSE に差し替える、といった事故を防ぐ。LICENSE 系ファイルからは SPDX タグまたは既知のライセンステンプレートでライセンスを判別し、ソースファイルからは SPDX ヘッダの有無と許可リストを検証する。

```bash
monban license                 # すべてのルールを実行
monban license --rule file     # 特定ルールだけ実行
monban license --diff=main     # 差分スコープに限定 (詳細: ./diff.md)
monban license --json          # JSON 出力
```

検出のみ。依存パッケージ間のライセンス互換性は cargo-deny / licensee の領域で、monban のスコープ外。

---

## ルール一覧

| # | Rule | 対象 | 概要 |
|---|--------|------|------|
| 1 | `file` | LICENSE 系ファイル | ライセンスを判別し `allowed` リストで検査 |
| 2 | `header` | ソースファイル | `SPDX-License-Identifier:` ヘッダが `allowed` 内かを検査 |

---

## 設定

```yaml
# monban.yml
license:
  file:
    - path: "LICENSE"
      allowed: ["MIT", "Apache-2.0"]
  header:
    - path: "src/**/*.ts"
      exclude: ["src/vendor/**"]
      allowed: ["MIT"]
      within_lines: 5
```

---

## 1. file

LICENSE 系ファイルのライセンスを判別し、必要に応じて allowlist と照合する。

判別は二段階：

1. **SPDX タグ** — `SPDX-License-Identifier: <id>` があればそれを採用
2. **テンプレート照合** — なければ既知のフレーズ（`MIT License`、`Apache License, Version 2.0`、`BSD 3-Clause`、`BSD 2-Clause`、`ISC License`、`GNU GENERAL PUBLIC LICENSE Version 3` / `Version 2`、`GNU LESSER GENERAL PUBLIC LICENSE Version 3`、`Mozilla Public License, Version 2.0`、`The Unlicense`、`CC0 1.0 Universal`）にマッチさせる

どちらでも判別できなければ「判別不能」として報告する。

### 設定

```yaml
license:
  file:
    - path: "LICENSE"
      allowed: ["MIT", "Apache-2.0"]
      message: "MIT または Apache-2.0 を使用してください"  # 任意
      severity: error                                       # 任意、既定 error
```

### フィールド

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `path` | string | はい | LICENSE 系ファイルの glob。マッチなしは「見つかりません」として報告 |
| `allowed` | string[] | いいえ | SPDX 識別子の allowlist。省略すると「何らかのライセンスが判別できる」だけ確認 |
| `message` | string | いいえ | 既定メッセージの差し替え |
| `severity` | `"error"` \| `"warn"` | いいえ | 重大度（既定 `error`） |

### 出力例

```
ERROR [file] LICENSE
  未許可のライセンスです: GPL-3.0 (許可: MIT, Apache-2.0)
```

---

## 2. header

各ソースファイルの先頭 N 行に `SPDX-License-Identifier:` ヘッダがあり、その値が許可リストに含まれることを検証する。

### 設定

```yaml
license:
  header:
    - path: "src/**/*.ts"
      exclude: ["src/generated/**"]
      allowed: ["MIT"]
      within_lines: 10                # 既定 10
      message: "SPDX ヘッダがありません"  # 任意
      severity: warn                   # 任意、既定 warn
```

### フィールド

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `path` | string | はい | ソースファイルの glob |
| `exclude` | string[] | いいえ | 除外する glob |
| `allowed` | string[] | いいえ | 許可する SPDX 識別子。省略時は「ヘッダが存在する」だけ要求 |
| `within_lines` | integer | いいえ | 探索範囲（既定 10） |
| `message` | string | いいえ | 既定メッセージの差し替え |
| `severity` | `"error"` \| `"warn"` | いいえ | 重大度（既定 `warn`） |

### 出力例

```
WARN  [header] src/foo.ts
  先頭 10 行に SPDX-License-Identifier ヘッダがありません。
```

---

## 共通出力

```
$ monban license

monban license — ライセンスチェック

  ✓ file
  ✗ header               2 violations (warn)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  2 violations (2 warnings)
  1/2 rules passed
```
