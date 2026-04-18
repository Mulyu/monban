# 機能追加の判断記録

monban の機能追加検討の履歴。採用・不採用にかかわらず、候補と理由を残す。

判断の手順は [`SKILL.md`](./SKILL.md) の「機能追加の進め方」を参照。

---

## 2026-04-18: ファイル行数・出現回数・順序系の追加提案

### 採用（提案ステータス）

#### ① `monban size`（新規コマンド）

| 項目 | 内容 |
|---|---|
| 形式 | 新規コマンド |
| 理由 | 行数のカウントは既存の `path` / `content` では表現できない判定手段（glob + 行カウント） |
| 設定例 | `size.max: [{ path: "src/**/*.ts", lines: 300 }]` |

#### ② `content.forbidden` / `content.required` に `max` / `min` フィールド追加（既存拡張）

| 項目 | 内容 |
|---|---|
| 形式 | 既存ルールのフィールド追加 |
| 理由 | パターンの出現回数制限は「独立ルールを増やすより既存フィールドで表現する」原則に従う。`max: 0`（forbidden の既定）・`min: 1`（required の既定）で現行互換 |

#### ③ `content.order`（既存コマンドに新ルール追加）

| 項目 | 内容 |
|---|---|
| 形式 | `content` に新ルール |
| 理由 | 複数パターンの出現順序は既存ルールでは表現できない独立概念。`patterns` 配列の順で上から下への一方向チェックに限定し、双方向化を避ける |

### 不採用

| 候補 | 理由 |
|---|---|
| `monban encoding` | BOM や `\r$` は `content.forbidden` の regex で表現可能。新規コマンドは過剰 |
| `monban deps` | 禁止パッケージ名は `content.forbidden` で `path: "package.json"`, `pattern: "\"lodash\""` として表現可能 |
| `content.count`（独立ルール） | `forbidden.max` / `required.min` のフィールド拡張で吸収できる（重複排除） |
| `monban stale` | ファイル mtime・コミット日時に依存し、glob + regex の枠を超える |
| `path.owner`（初期案） | CODEOWNERS 同期は双方向になりがち。のちに `github.codeowners` として path→owners の一方向に限定して採用 |

---

## 2026-04-18: GitHub 拡張を `monban github` に集約

従来の `monban actions` を `monban github` にリネーム・拡張し、GitHub 特有ファイル（workflows / CODEOWNERS）の構造パースを 1 コマンドに集約する。

### 採用

#### ① `monban actions` → `monban github` へ集約（コマンド再編）

| 項目 | 内容 |
|---|---|
| 形式 | 既存コマンドのリネーム + 対象拡張 |
| 理由 | GitHub 特有ファイルのうち独自構文パースを要するもの（workflows / CODEOWNERS）を 1 コマンドに集約するほうが発見性が高い。発散を避けるための物理的な置き場 |

#### ② `github.pinned` の `targets` フィールド拡張（既存拡張）

| 項目 | 内容 |
|---|---|
| 形式 | 既存ルールのフィールド追加 |
| 理由 | action のほか reusable workflow（`./.github/workflows/x.yml@sha`）・docker image（`docker://foo@sha`）のピン留めも同一ルールで扱える。独立ルール化しない |

#### ③ `github` に新ルール 7 つ

いずれも YAML 構造解析が要るもののみ採用（regex では記法ゆれに弱い、または複数ファイル横断が必要）。

| ルール | 採用理由 |
|---|---|
| `permissions` | `permissions:` ブロックはスカラー / マップの記法ゆれがあり、YAML パースが堅牢 |
| `triggers` | `on:` も文字列 / 配列 / マップの記法ゆれあり |
| `runner` | `runs-on:` の allowlist |
| `timeout` | 「全 job に `timeout-minutes:` 必須」は job ノード走査が堅牢 |
| `concurrency` | workflow 単位での宣言必須 |
| `consistency` | 複数ファイル横断でバージョンを突き合わせる（regex 単体では不可） |
| `secrets` | `${{ secrets.X }}` 参照の allowlist |

#### ④ `github.codeowners`（既存コマンドに統合）

| 項目 | 内容 |
|---|---|
| 形式 | `github` コマンド配下のルール |
| 理由 | 当初は独立コマンド案だったが、GitHub 特有ファイル群として `github` に集約。`path → owners` の一方向に限定して原則遵守 |

### 不採用 — 既存ルールで表現可能（docs の設定例に留める）

| 候補 | 既存表現 |
|---|---|
| LICENSE / SECURITY.md / CONTRIBUTING.md / CODE_OF_CONDUCT.md の存在 | `path.required` |
| PR / Issue テンプレートの必須セクション | `content.required` |
| `dependabot.yml` / `FUNDING.yml` / `labels.yml` / `settings.yml` のキー存在 | `content.required` |
| `continue-on-error: true` の禁止 | `content.forbidden` |
| `runs-on: self-hosted` の禁止 | `content.forbidden` |
| `.gitignore` / `.gitattributes` / `.editorconfig` の必須項目 | `content.required` |
| CHANGELOG の keep-a-changelog 準拠 | `content.required` |
| README バッジの required | `content.required` |
| shell strict mode（`set -euo pipefail`） | `content.required` |

### 不採用 — 原則違反

| 候補 | 違反する原則 | 理由 |
|---|---|---|
| CODEOWNERS: owner → 担当範囲 の割当率チェック | 一方向 | path→owner と owner→path の両方向になる |
| dependabot の ecosystem 網羅（「`package.json` があるなら `npm` ecosystem 必須」） | 一方向 | ファイル A の存在からファイル B の内容を要求するのは双方向 |
| step outputs の未使用検出 | 言語非依存 | 変数フロー解析は AST 的発想に近い |
| `needs:` の参照整合（存在しない job 依存の検出） | 言語非依存 / 検出のみ | 型検査に近く、YAML 構造依存度が高い（将来再検討の余地あり） |
| cron 重複検出（thundering herd） | 検出のみ | 実害判定が曖昧。ユーザー判断に委ねるべき |

### 不採用 — スコープ外

| 候補 | 理由 |
|---|---|
| branch protection / 必須ステータスチェック等の GitHub API 経由の設定 | monban はファイルシステムベース。API に触れない |
| リポジトリトピック / 可視性 / Webhook 設定 | 同上 |
