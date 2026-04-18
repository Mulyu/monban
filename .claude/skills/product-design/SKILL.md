---
name: product-design
description: monban のプロダクト設計原則。機能追加、ルール設計、ドキュメント作成、設定フォーマットの決定時に使用する。monban の設計判断や仕様に関する質問・提案・実装を行うときにトリガーする。
---

# monban プロダクトデザイン

## 設計原則

### 言語非依存

- AST、import 解析、型情報など言語固有の機能に依存しない
- ファイルシステムの走査（glob / パス解析）、プレーンテキストの正規表現、YAML / マニフェストの構造パースのみで動作する
- TypeScript / Ruby / Python / Go など、どの言語のプロジェクトでも同じルールが使える
- 例外は `monban deps` のみ。外部レジストリ API（ecosyste.ms）に出るが、単一 API で複数エコシステムを吸収するため言語非依存は崩さない。オフライン環境では `--offline` で allowlist / denylist のみ実行する

### 検出のみ、修正はしない

- monban は違反の検出に集中する。`--fix` はサポートしない
- 修正はエージェントまたは人間が行う

### チェックの方向は一方向

- 1つのルールで双方向のチェックをしない
- 例: naming は「場所 → 名前」のみ。「名前 → 場所」はやらない

### 重複の排除

- 同じことを別の書き方で表現できるルールは統合する
- 独立ルールを増やすより、既存ルールのフィールドで表現する
- 例: extension_guard → forbidden の `path: "src/**/*.js"` で表現
- 例: co_location → required の companions モードで表現

### diff はスコープフィルタ、判定条件ではない

- `--diff` は対象ファイルを絞るフィルタであって、判定ロジックの条件にはしない
- 「差分に N 個以上新規追加されたら警告」のような差分前提のルールは作らない
- 同じルールがフル走査でも差分走査でも同じ意味を持つように設計する
- 差分で初めて成立する判定（差分内の新規追加数上限など）は不採用

## コマンド体系

| コマンド | 対象 | 判定手段 |
|---------|------|---------|
| `monban path` | パス構造（存在、命名、深度、数） | glob / パス文字列 |
| `monban content` | ファイル内容（禁止・必須パターン・行数） | 正規表現 / 行カウント |
| `monban doc` | ドキュメントとコードのハッシュ整合 | SHA256 |
| `monban github` | GitHub 特有ファイル（workflows / CODEOWNERS） | YAML パース / 独自構文 |
| `monban deps` | 依存パッケージの実在・鮮度・人気度・類似性 | マニフェスト構造パース + 外部レジストリ API 照合 |

全コマンドに共通する `--diff` フラグで PR 差分にスコープを限定する（`git merge-base` による対象ファイル列挙）。新ルール・新コマンドではなく、既存コマンドのスコープフィルタとして実装する。

### monban path のルール

| ルール | 概要 |
|--------|------|
| `forbidden` | 存在してはならないパス |
| `required` | 存在しなければならないファイル（files / companions） |
| `naming` | 命名規則（場所 → 名前の一方向） |
| `depth` | ネスト深度制限 |
| `count` | ファイル数制限 |

### monban content のルール

| ルール | 概要 |
|--------|------|
| `forbidden` | 禁止テキストパターン・BOM・不可視文字・シークレット |
| `required` | 必須テキストパターン |
| `size` | ファイル行数上限 |

### monban github のルール

| ルール | 対象 | 概要 |
|--------|------|------|
| `pinned` | workflows | `uses` のピン留め（action / reusable / docker） |
| `required` | workflows | 必須ワークフロー・必須ステップ |
| `forbidden` | workflows | 禁止アクション |
| `permissions` | workflows | `permissions:` の宣言必須・最小権限 |
| `triggers` | workflows | `on:` イベントの allow/deny |
| `runner` | workflows | `runs-on:` の allowlist |
| `timeout` | workflows | job に `timeout-minutes:` 必須 |
| `concurrency` | workflows | `concurrency:` 宣言必須 |
| `consistency` | workflows | 同一アクションのバージョン一貫性 |
| `secrets` | workflows | `${{ secrets.X }}` の allowlist |
| `codeowners` | CODEOWNERS | path → owners の一方向整合 |

GitHub 関連でも、構造パースが不要なもの（LICENSE / SECURITY.md の存在、PR テンプレートの必須セクション、`.gitignore` の必須パターン、`continue-on-error: true` 禁止 など）は `path.required` / `content.required` / `content.forbidden` で表現し、`github` に取り込まない。

### monban deps のルール

| ルール | 概要 |
|--------|------|
| `existence` | レジストリに該当パッケージが存在しない（hallucination / slopsquat 検出） |
| `freshness` | 公開から閾値以内の新規パッケージ |
| `popularity` | 週間ダウンロード数が閾値未満 |
| `cross_ecosystem` | 別エコシステムにしか存在しない名前の要求 |
| `typosquat` | 人気パッケージと編集距離が近い類似名 |
| `allowed` | allowlist（指定名のみ許可） |
| `denied` | denylist（指定名を禁止） |

対象マニフェストは `package.json` / `requirements.txt` / `pyproject.toml` / `go.mod` / `Gemfile` / `Cargo.toml` / `.github/workflows/**/*.yml`。エコシステムはファイル名から自動判定する。

## 設定フォーマット

- 全ルールのセレクタは `path`（glob パターン）で統一する
- `pattern` ではなく `path` を使う（「パターン」ではなく「場所」起点）
- content ルールのみ、対象ファイル選択に `path`、テキスト検査に `pattern` を使う

## 機能追加の進め方

新機能を検討するときは以下の手順で進める。採否にかかわらず判断の根拠を `decisions.md` に残す。

### 1. ブレスト（広く列挙）

既存コマンドの延長・新規コマンドを問わず候補を出す。徹底的に書き出してから絞る。

### 2. 設計原則で段階的に篩う

以下の順で評価し、早い段階で済ませられるならそこで止める。

1. **既存ルールで表現可能か**（例: `path.required`, `content.forbidden`）
   → 可能なら独立ルール化せず、docs の設定例として掲載する
2. **既存ルールのフィールド拡張で表現可能か**
   → 可能なら既存ルールにフィールドを追加する（`content.forbidden` に `max`、`actions.pinned` に `targets` など）
3. **既存コマンドに新ルールを追加するのが妥当か**
   → 対象ファイル群と判定手段が既存コマンドと合致する場合
4. **新コマンドを立てるのが妥当か**
   → 判定手段が既存と異なる場合のみ（glob→行カウント、独自構文パースなど）

### 3. 一方向性の確認

「A があれば B があるべき」が片方向に還元できているかを確認する。双方向になるものは不採用。

- 例: `naming` は「場所 → 名前」のみ。「名前 → 場所」はやらない
- 例: `codeowners` は「path → owners」のみ。「owner → 担当範囲」はやらない

### 4. 判断記録

候補名、採否、理由、既存ルールでの代替方法を `decisions.md` に追記する。不採用にしたものも必ず残す（あとで再検討するときの根拠になる）。

詳細な判断履歴は [`decisions.md`](./decisions.md) を参照。

## ドキュメント構成

### README.md

- 全コマンドの概要と設定例を記載
- 各コマンドの詳細は `docs/` 配下の個別ファイルへリンク

### docs/ 配下

- コマンドごとに 1 ファイル（`path.md`, `content.md` など）
- 各ファイルの構成:
  1. コマンドの概要と CLI 使用例
  2. ルール一覧表
  3. 設定全体の YAML 例
  4. ルールごとの詳細（目的、設定例、フィールド表、出力例）
  5. 共通出力フォーマット
- 設定例は言語固有にせず複数言語の例を混ぜる
