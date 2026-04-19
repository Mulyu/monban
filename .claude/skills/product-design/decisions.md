# 機能追加の判断記録

monban の機能追加検討の履歴。採用・不採用にかかわらず、候補と理由を残す。

判断の手順は [`SKILL.md`](./SKILL.md) の「機能追加の進め方」を参照。

---

## 2026-04-18: リファクタリング計画から派生した機能追加検討

リファクタリング計画（schema.ts の分割、cli.ts のオーケストレータ抽出、I/O のポート化、エラーハンドリング統一）で、monban 自身のコードベースを自己検査したい要求が浮上。現行 `monban.yml` のルールで表現できない項目を洗い出し、原則に照らして仕分けた。

### 採用（提案ステータス）

#### ① `path.required` の `companions` を cross-directory 対応（既存拡張）

| 項目 | 内容 |
|---|---|
| 形式 | 既存ルールのフィールド拡張 |
| 理由 | 「`src/rules/foo/` があれば `docs/foo.md` があるべき」のような一方向の随伴関係を、現行の `files` / `companions` では相対指定前提のため表現できない。別ディレクトリへの参照を許すことで表現可能にする |
| 用途 | ルール追加時に docs 更新漏れを検出、monban 自身のドッグフーディング強化 |
| 一方向性 | 「場所 → 随伴ファイル」の一方向。逆方向（docs があれば src があるべき）はやらない |

#### ② `content.forbidden` / `content.required` に `exclude` フィールド追加（既存整合化）

| 項目 | 内容 |
|---|---|
| 形式 | 既存フィールドの横展開（新機能ではない） |
| 理由 | `ForbiddenRule`（path）・`RequiredRule`・`CountRule`・`DepsExistenceRule` には既に `exclude?: string[]` がある。content ルールだけ抜けているので揃える |
| 用途 | 「`src/ports/` 以外で `fetch(` 禁止」のような「特定ディレクトリだけ例外」を既存機能の組み合わせで表現可能にする |
| 補足 | 独立した新ルール化（`except_path` のような別名）はしない。既存 `exclude` の名称で統一する（重複排除） |

### 不採用

| 候補 | 理由 |
|---|---|
| `path.count` に `diff_max` フィールド追加（差分内の新規追加数上限） | `--diff` でのみ機能する判定は新原則「diff はスコープフィルタ、判定条件ではない」に違反。フル走査で意味を持たない |
| 関数数・export 数の上限ルール | AST 解析が必要で「言語非依存」原則違反。代替として `content.forbidden` の `max`（同一パターンの出現回数上限、`① max/min` 提案）で近似可能 |
| コマンドハンドラの構造的繰り返し検出（連続する関数呼び出しパターンの一致） | 正規表現・glob の範疇を超える。CLI 層の類似度は `content.forbidden` の個別パターン禁止＋`max` で近似 |
| import 方向の制約（layering） | AST 不要原則に反する。文字列ベースで `from.*orchestrator` を rules 層で禁止する近似で十分 |
| `monban config lint`（設定ファイル自身の検証：extends 循環、未使用 exclude など） | 新コマンドは過剰。`monban all` 実行時の内部検証で吸収する |

---

## 2026-04-18: ファイル行数を既存 content コマンドの新ルールとして追加

### 採用（提案ステータス）

#### ① `content.size`（既存コマンドに新ルール追加）

| 項目 | 内容 |
|---|---|
| 形式 | `content` に新ルール（当初は `monban size` 新コマンドで検討したが、「内容の計測」という括りで `content` 配下に収めて発散を避ける） |
| 理由 | 行数のカウントは既存の `content.forbidden` / `content.required` では表現できない判定手段（glob + 行カウント）。ただし新コマンドを切るほどの独立性はないので、`content` 配下の 3 つ目のルールとして追加する |
| 設定例 | `content.size: [{ path: "src/**/*.ts", max_lines: 300 }]` |

### 不採用

| 候補 | 理由 |
|---|---|
| `content.forbidden` / `content.required` に `max` / `min` フィールド追加 | 出現回数制限は用途が狭く、`content.forbidden` の既定動作（0 個）・`content.required` の既定動作（1 個以上）と重複気味。必要性が顕在化してから再検討する |
| `content.order`（複数パターンの出現順序） | 順序制約は「一方向チェック」原則を満たすが、独立ルール化するほど需要が顕在化していない。パターン検査の自然な延長として後日必要になったら復活検討 |
| `monban encoding` | BOM や `\r$` は `content.forbidden` の regex で表現可能。新規コマンドは過剰 |
| `monban deps` | 禁止パッケージ名は `content.forbidden` で `path: "package.json"`, `pattern: "\"lodash\""` として表現可能 |
| `content.count`（独立ルール） | 上記 max/min と同様、需要顕在化まで保留 |
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

---

## 2026-04-18: Tier 1 企画書の採否判断（deps / `--diff`）

[Tier 1 企画書](https://example.com/anchor) のうち、プリセット（`@mulyu/monban-preset-agent`）を除く 2 機能について採否を判断する。プリセットは本体機能ではなくルール集の配布物で、`extends` 経由の別パッケージとして Tier 1 のコア機能処理からは分離する。

### 採用

#### ① `monban deps`（新規コマンド）

マニフェストから依存名を抽出し、パッケージレジストリで実在・鮮度・ダウンロード数を照合する。

| 項目 | 内容 |
|---|---|
| 形式 | 新規コマンド |
| 理由 | 対象と判定手段が既存コマンドと一致しない。`existence`（hallucination / slopsquat 検出）は外部レジストリ API 照合が必須で、glob / 正規表現 / YAML パースのいずれでも原理的に表現不可 |
| 原則との関係 | **言語非依存・AST 不要は維持**（ecosyste.ms が単一 API で npm / PyPI / RubyGems / Cargo / Go / GitHub Actions を吸収）。ただし monban 初の「外部ネットワーク依存」であり、オフライン環境では `--offline` で `allowed` / `denied` のみ実行する |

採用ルール:

| ルール | severity 既定 | 内容 |
|---|---|---|
| `existence` | error | レジストリに該当パッケージが存在しない |
| `freshness` | warn | 公開から閾値以内の新規パッケージ |
| `popularity` | warn | 週間ダウンロード数が閾値未満 |
| `cross_ecosystem` | warn | 別エコシステムにしか存在しない名前を要求している |
| `typosquat` | warn | 人気パッケージと編集距離が閾値以下 |
| `allowed` | error | allowlist（指定名のみ許可） |
| `denied` | error | denylist（指定名を禁止） |

対応マニフェスト（第一弾）: `package.json` / `requirements.txt` / `pyproject.toml` / `go.mod` / `Gemfile` / `Cargo.toml` / `.github/workflows/*.yml`。エコシステムはファイル名から自動判定する（設定側で指定しない）。

セレクタは他コマンドと同じく `path`（glob）。既存ルール様式に合わせ、`deps.<rule>` は必ずオブジェクト配列で表現する（`checks: {}` のようなスカラ形式は採らない）。

#### ② `--diff` フラグ（全コマンド横串）

| 項目 | 内容 |
|---|---|
| 形式 | `all` / `path` / `content` / `doc` / `github` / `deps` 共通の CLI フラグ。新コマンド・新ルールは追加しない |
| 理由 | スコープフィルタであってルールではない。差分ベース検査は PR レビューに必須の運用機能で、既存の rule / command 構造と直交する |
| 原則との関係 | 言語非依存・AST 不要は維持。`git merge-base` と `git diff --name-only` を呼ぶため git が前提だが、CI 実行環境では既に前提となっている |

スコープ決定の優先順位:

1. `--diff=<ref>` 明示指定（`main` / `HEAD~3..HEAD` / `<sha>` 等）
2. `--diff` 単独指定時の自動検出: CI 環境（`GITHUB_BASE_REF` 等）→ なければ `git merge-base origin/main HEAD`
3. フラグなし: フル走査（従来挙動）

`--diff-granularity` は `file`（既定: 追加・変更されたファイル全体を検査）/ `line`（追加行のみ検査）。行粒度は依存関係を破壊する変更を捕捉しにくいので既定はファイル粒度。

### 不採用 — スコープ外（Tier 2 以降もしくは別ツール）

| 候補 | 理由 |
|---|---|
| lockfile の完全依存解決 | Dependabot / Renovate の領域 |
| CVE スキャン | Snyk / OSV-Scanner の領域 |
| インストールスクリプト挙動解析 | Socket の領域 |
| ライセンスコンプライアンス | cargo-deny / licensee の領域 |
| semantic / LLM ベースのコードレビュー | Claude Code Review / Codacy の領域 |

`monban deps` は **hallucination / slopsquat の入口で止める** 一点に集中する。

---

## 2026-04-18: `github` の namespace を 2 階層化（対象ファイル別）

従来フラットだった `github.<rule>` 11 ルールを、対象ファイル別の 2 階層 `github.<file-group>.<rule>` に再編する。

### 背景

GitHub 特有ファイルで `monban github` が扱う対象は workflows（`.github/workflows/**/*.yml` と action.yml）と CODEOWNERS の 2 系統。将来 `dependabot.yml` など別ファイルが加わったとき、フラット namespace だと同一キー名の衝突（例: `required`）が避けられない。対象ファイル別の括りで発見性と拡張性を確保する。

### 採用

#### ① `github.actions.*` / `github.codeowners.*` への再編

| 項目 | 内容 |
|---|---|
| 形式 | 設定 namespace の破壊的再編（v0.1.0 のため互換層を置かず一気に切替） |
| 旧 → 新 | `github.pinned` → `github.actions.pinned` / `github.required` → `github.actions.required` / ... / `github.codeowners` → `github.codeowners.ownership` |
| ルール名 | CLI `--rule` 指定・違反出力の `[rule]` ラベル・JSON の `rule` フィールドすべてドット区切りに統一（例: `actions.pinned`、`codeowners.ownership`） |
| 対象ファイル | 各ルールは従来どおり `path` フィールドで glob を明示する。namespace 側で対象を暗黙固定しない（monban 全体の「セレクタは `path` で統一」方針の維持） |
| 一方向性 | `actions.*` は「workflow → ルール要件」、`codeowners.ownership` は「path → owners」の片道。再編で変化なし |

#### ② `codeowners` も 2 階層で揃える

| 項目 | 内容 |
|---|---|
| 形式 | `github.codeowners: { ownership: [...] }`（単一ルールでも `actions` と同じ 2 階層構造を維持） |
| 理由 | 単一ルールだけフラットにすると「`github.actions` はオブジェクト、`github.codeowners` は配列」という形状ゆれが生じ、拡張時の判断コストと、YAML 書き手の学習コストが上がる。整合性優先で `ownership` サブキーに包む |

### 不採用

| 候補 | 理由 |
|---|---|
| フラット namespace に `github.codeowners` のみ残す（配列のまま） | `actions` と `codeowners` で形状がずれる。書き手の「何をどこに入れるか」判断が増える |
| 旧 namespace との deprecation 互換層 | v0.1.0 で外部ユーザーがまだ限定的。一気切替の方が学習コスト総和が小さい |
| namespace 側での対象ファイル暗黙固定（`actions.*` → `.github/workflows/**/*.yml` を既定に） | 他コマンドとの整合（すべて `path` 必須）が崩れ、exclude / 対象拡張（action.yml 追加など）の自由度が下がる |
| `dependabot.yml` 等の新規ファイル群サポートを同時実装 | 本再編は namespace の再編のみに集中。`github.dependabot.*` は将来別案として Brainstorm からやり直す |

---

## 2026-04-19: Web リサーチを踏まえた次期機能の一括判断

2025–2026 の供給網攻撃（Shai-Hulud npm ワーム、tj-actions/changed-files、litellm PyPI 侵害、slopsquatting）と、AI エージェント開発の標準化（`AGENTS.md` の Linux Foundation steward 化、`.mcp.json` の一般化、MCP 関連 CVE の多発）、および linter エコシステムの成熟（SARIF 2.1.0 の CI 標準化、`fail_text` による AI 自動修復ループ）を受けて、次期追加機能を 3 ラウンドの調査で洗い出し、原則で篩った。

### 採用 — 既存コマンドの拡張

#### ① `content.forbidden` / `content.required` の直交フィールド 4 種

| 追加フィールド | 内容 | 置換される新ルール案 |
|---|---|---|
| `preset: injection \| merge_conflict \| private_key` | 組み込みパターン集（不可視 unicode U+E0000–E007F、bidi、zero-width、"ignore previous instructions" 系、conflict マーカー、秘密鍵） | `content.merge_conflict`、`agent.injection`、`monban security` |
| `yaml_key` (JMESPath) / `json_key` (JSONPath) | 構造化セレクタ。`pattern:` と排他。parse 済み YAML/JSON の特定キーだけを regex 検査 | `monban manifest`、`monban compose`、`monban k8s`、`content.structured` |
| `anchor: start` + `within_lines: N` | 先頭 N 行限定マッチ（shebang、SPDX、`// Code generated ... DO NOT EDIT.`） | `content.starts_with`、独立した generated-marker ルール |
| `min_entropy: <float>` + `min_length: <int>` | `pattern:` 捕捉グループに対するモディファイア（文脈付き secret 検出） | `content.entropy` 単独 |

理由: gitleaks / secretlint / Spectral の共通パターンは「汎用ルール + preset 合成 + 直交モディファイア」。monban の「小さな道具を合成する」思想と一致する。新ルールを増やさず既存 shape のまま覆える範囲が最大。

#### ② `path` に新ルール 4 種

| ルール | 理由 |
|---|---|
| `path.count` | ls-lint の `exists: N-M` 相当。glob 単位の min/max ファイル数は `path.forbidden`（0 固定）・`path.required`（1 以上）では表現できない |
| `path.hash` | 単一ファイルの SHA256 固定（LICENSE / ベンダ済 / 生成物）。既存 `doc.ref` は「A に B のハッシュが埋まっている」cross-file 照合で別概念 |
| `path.size` | glob 単位のバイト上限。既存 `content.size` は行数で、バイナリ・画像・バンドル成果物を扱えない |
| `path.case_conflict` | 大小違いで衝突するファイル名。macOS/Windows 破壊の一方向検出 |

#### ③ `path.forbidden` に `type: symlink` フィールド追加

既存 `path.forbidden` の glob 指定に加え、ファイルタイプで絞り込む。`path.symlink` を独立化しないのは `forbidden` の自然な拡張で済むため。

#### ④ `github.actions` の拡張

| 変更 | 理由 |
|---|---|
| 既存 `actions.pinned` に `format: sha40` フィールド | tj-actions 事件で明確化された「40 桁 hex SHA 必須」。GitHub 自身が 2025/8 にピン留めポリシーを追加 |
| 新ルール `actions.danger` | `pull_request_target` + `actions/checkout` の組み合わせ、`persist-credentials: false` 未指定など既知のフットガン |
| 新ルール `actions.injection` | `${{ github.event.*.body \| *.title \| *.head.ref }}` 等の不信頼入力が `run:` 内に直埋めされていないか |

#### ⑤ `deps` に新ルール 3 種

2025–26 の npm 攻撃（Shai-Hulud など）の 72% は install lifecycle フック経由。regex 単体でも可能だが、マニフェストのキー構造を理解する既存 `deps` に寄せる。

| ルール | 内容 |
|---|---|
| `deps.install_scripts` | `preinstall` / `install` / `postinstall` / `prepare`（package.json）/ `[tool.poetry.scripts]` の build hooks / `post_install_message`（Gemfile）等のライフサイクルフック検出 |
| `deps.git_dependency` | `git+` / `file:` / URL 直指定の依存。slopsquat / Remote Dynamic Dependencies（PhantomRaven）対策 |
| `deps.floating_version` | `^` / `~` / `*` / `latest` / 上限なしの `>=`。`freshness` が「未来の公開から」を見るのに対し、こちらは「未来の範囲を許容する設定」を見る |

#### ⑥ `git` に新ルール 2 種（予約済み `monban branch` を吸収）

| ルール | 内容 |
|---|---|
| `git.branch_name` | ブランチ名 regex（例: `^(feat\|fix\|chore)/[a-z0-9-]+$`、`^claude/.*`） |
| `git.tag_name` | タグ名 regex（SemVer: `^v\d+\.\d+\.\d+$`） |

`monban branch` の独立コマンド化は不採用。対象がすべて `git` の管理下で、既存 `git.commit.*` と同じ「命名規約 regex」の延長で表現できる。

### 採用 — 新規コマンド

#### ⑦ `monban agent`

AGENTS.md / CLAUDE.md / MCP / AI ignore ファイル群を扱う新コマンド。

| ルール | 対象 | 内容 |
|---|---|---|
| `agent.instructions` | `AGENTS.md` / `CLAUDE.md` | 存在、必須 H2 セクション（Commands / Testing / Style / Boundaries 等）、サイズ上限、オプションの `---` frontmatter（`description` / `tags`）shape |
| `agent.mcp` | `.mcp.json` / `.claude/settings.json` / `.cursor/mcp.json` | top-level `mcpServers` 必須、各 server に `command \| url`、`env` 値の生シークレット禁止（`${...}` 要求）、`npx ... @latest` 禁止、`curl \| sh` コマンド禁止、allow/deny list |
| `agent.ignore` | `.llmignore` / `.aiexclude` / `.claudeignore` / `.cursorignore` | `.env*` / `*.pem` / `id_rsa` / `**/secrets/**` の必須カバレッジ |

理由:

- 2026 年時点で `AGENTS.md` は LF stewarded、`.mcp.json` のコミット運用が一般化、MCP 関連 CVE が 2025 だけで 10 件超（CVE-2025-68143/68144/68145、CVE-2025-53773、CVE-2025-6515 等）。ドメインが独立している
- 既存 `github` コマンドの先例（workflows + CODEOWNERS を 1 コマンドにまとめた）と同じ発想。AGENTS.md + MCP + ignore を 1 コマンドに集約する方が発見性が高い
- 競合 OSS（AgentLinter / ctxlint / cclint / agentlinter）もこの括りで収束
- `monban mcp` を別コマンドにすると `.mcp.json` と `.claude/settings.json` の重複が両コマンドに跨り、`agent.ignore` との共有文脈が割れる

### 採用 — 横断メタ機能（優先順）

| 優先 | 機能 | 内容 | 根拠 |
|---|---|---|---|
| 1 | `fail_text` / remediation | 各ルールに YAML で `fail_text: "..."` 指定、JSON 出力に `remediation: { description, suggested_action, docs_url }` | lefthook / Factory.ai / BitsAI-Fix 事例。AI エージェント自己修復ループの基盤 |
| 2 | 終了コード規律 | `0` pass / `1` violations / `2` config error | ESLint / Biome / golangci-lint に整合。CI 誤グリーン防止 |
| 3 | `--sarif` 出力 | SARIF 2.1.0 形式 | GitHub Code Scanning / Azure DevOps GHAS / GitLab すべて consume。Security タブ + PR annotation が 1 フラグで有効化 |
| 4 | `severity`（error / warn のみ） | ルール単位で error / warn 指定 | conftest の `deny` / `warn` 相当。staged rollout に必須。`info` は YAGNI |
| 5 | baseline file | `monban-baseline.json` をチェックイン、既存違反を grandfather | PHPStan / ESLint `eslint-suppressions.json` の no-mtime 方式。legacy repo 採用の必須条件 |
| 6 | `tags` + `--tag` フィルタ | ルール総数 50 超えで有効化。スキーマフィールドだけ先に確保 | Semgrep 事例。小規模では YAGNI |

### 不採用 — 既存ルールで表現可能（独立化しない）

| 候補 | 既存表現 |
|---|---|
| `.env.example` 必須化 | `path.required`（ただし `.env` との key 一貫性は双方向で除外） |
| `.env` / `id_rsa` コミット検出 | `path.forbidden` + `content.forbidden` |
| AGENTS.md の必須セクション個別指定 | `content.required`（agent.instructions がプリセットとして覆う） |
| 生成ファイルの `DO NOT EDIT` マーカー | `content.required` の `anchor: start` + `within_lines: N` |
| `.npmrc` / `.yarnrc` / `pip.conf` の https 強制・`ignore-scripts=true` 等 | `content.forbidden` / `content.required`。docs のレシピに留める |
| `renovate.json` / `dependabot.yml` / `pre-commit-config.yaml` / `devcontainer.json` の必須フィールド | `content.required` + `yaml_key` / `json_key`。docs のレシピ |
| docker-compose の `:latest` 禁止・`privileged: true` 禁止 | `content.forbidden` + `yaml_key` |
| Dockerfile の `FROM` ピン留め・`USER root` 禁止・`ADD URL` 禁止 | 行 regex で `content.forbidden` / `content.required`（ただし multi-stage 意味論には踏み込まない） |
| prompt injection の不可視文字検出 | `content.forbidden` の `preset: injection` |
| マージコンフリクトマーカー検出 | `content.forbidden` の `preset: merge_conflict` |
| lockfile の存在 | `path.required.companions`（manifest → lockfile） |
| lockfile 内の URL ホスト allowlist | `content.forbidden` の `json_key`（`dependencies.*.resolved` 等） |

### 不採用 — 原則違反

| 候補 | 違反する原則 |
|---|---|
| `.env.example` ↔ `.env` の key 一貫性 | 一方向性（両ファイル間で欠損・過剰の両方向チェックになる） |
| `CLAUDE.md` ↔ `AGENTS.md` の内容同期 | 一方向性（`doc.ref` で片方を source of truth にする運用にユーザ判断で倒せるため独立ルール化しない） |
| `content.entropy` 単独ルール | 有用性（FP が多すぎる。gitleaks issue #1830）。`content.forbidden` の `min_entropy` モディファイアとしてのみ採用 |
| `content.starts_with` 独立ルール | 重複排除（`content.required` の `anchor: start` + `within_lines` で十分） |
| AI ignore ファイル間の rule 整合（`.aiexclude` と `.cursorignore` で差分禁止） | 一方向性 + 標準未確定（`.llmignore` 仕様が spec 段階） |

### 不採用 — スコープ外・競合優位なし・時期尚早

| 候補 | 理由 |
|---|---|
| `monban lockfile` 独立コマンド | `deps` に統合で十分。機能分担が曖昧になる |
| `monban registry` 独立コマンド | `.npmrc` / `.yarnrc.yml` / `pip.conf` は `content.forbidden` / `content.required` で表現可。docs レシピ |
| `monban mcp` 独立コマンド | `agent` に吸収。ドメインが `AGENTS.md` と重なる |
| `monban containers` / `monban docker` | Dockerfile 行 regex は可能だが multi-stage 意味論は hadolint に敵わない。docs レシピ |
| `monban compose` | `content.forbidden` + `yaml_key` で shallow 検査。深い検査は DCLint / Kyverno の領域 |
| `monban k8s` / `monban manifest` 汎用 YAML dialect | Kyverno / KubeLinter / Polaris / conftest が支配的。monban に edge なし。`content.yaml_key` で shallow policy のみ覆う |
| `monban pr` 予約（PR タイトル/本文/ラベル検証） | GitHub API 依存で file-system only 原則に抵触。保留継続 |
| `monban security` | `content.forbidden` の `preset:` で分散配置した方が合成性が高い |
| Terraform（HCL）/ Jenkinsfile（Groovy）/ Helm テンプレート | AST / テンプレート展開が必要。原則違反 |
| K8s の cross-resource（Service → Deployment セレクタ一致） | 意味論グラフ。AST 不要原則違反 |
| spec-kit / Kiro / Tessl の specs/ レイアウト | 規約がツール間で未統一。6–12 ヶ月待つ |
| ライセンス SPDX 判定 / SBOM 生成 / SLSA 署名検証 | 外部 API + 暗号。範囲外（2026-04-18 既定の再確認） |
| `.llmignore` / `.aiexclude` 等の必須化 | 業界標準が未確定（llmignore-spec が提案段階、13+ の競合ファイルが並存） |
| `tags` への `info` severity | YAGNI。error / warn の 2 段で運用可能 |
| preset のコードバンドル機構 | ルール総数 50 以下では docs の設定例で十分 |
| JUnit XML 出力 | GitHub 主軸の想定ユーザには SARIF で足りる。GitLab 主軸の要望が顕在化してから再検討 |
| reviewdog 形式の直接出力 | SARIF → reviewdog 変換で間接対応可能（sarif4reviewdog） |

### 実装の推奨順序

1. **`content` 拡張 1 パッケージ**（`preset` + `yaml_key`/`json_key` + `anchor`+`within_lines` + `min_entropy`/`min_length`）を一括で入れる。ここで `monban manifest` / `monban security` / `content.entropy` / `content.starts_with` を全部不要にできる
2. **横断メタ機能の 1–3**（`fail_text` / 終了コード規律 / `--sarif`）。小さく効く
3. **`monban agent` 新コマンド**（`agent.instructions` / `agent.mcp` / `agent.ignore` の 3 ルール）
4. **`path.*` 4 ルール**（`count` / `hash` / `size` / `case_conflict`）と `path.forbidden` の `type: symlink`
5. **`github.actions` 強化**（`pinned.format: sha40` / 新 `actions.danger` / 新 `actions.injection`）
6. **`deps` 3 ルール**（`install_scripts` / `git_dependency` / `floating_version`）
7. **`git` 2 ルール**（`branch_name` / `tag_name`）
8. 横断メタ機能の 4–6（`severity` / baseline / tags スキーマ）

この順で、ルール数は 34 → 約 50、コマンド数は 6 → 7（`agent` 追加のみ）、設計原則違反はゼロ。
