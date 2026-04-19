# 機能追加の判断記録

monban の機能追加検討の履歴。採用・不採用にかかわらず候補と理由を残す。判断の手順は [`SKILL.md`](./SKILL.md) の「機能追加の進め方」を参照。

時系列ではなくカテゴリ別のフラットリストで管理する。新しい判断は該当カテゴリに追記する。

---

## 採用

### コマンド

- `monban path` — パス構造（存在・命名・深度・数・ハッシュ・サイズ・大小衝突）
- `monban content` — ファイル内容（正規表現・BOM・不可視文字・秘密情報・injection・マージコンフリクト・行数）
- `monban doc` — ドキュメントと参照先のハッシュ整合・リンク切れ
- `monban github` — GitHub 特有ファイル（workflows / CODEOWNERS）。旧 `monban actions` を集約
- `monban deps` — 依存パッケージの実在・鮮度・人気度・類似性・供給網リスク
- `monban git` — コミットメッセージ・trailer・Issue 参照・変更粒度・ignore すり抜け・ブランチ名・タグ名
- `monban agent` — エージェント向け設定（AGENTS.md / CLAUDE.md / MCP / AI ignore）

### ルール追加

- `path.count` — ls-lint の `exists: N-M` 相当。glob 単位の min/max
- `path.hash` — 単一ファイル SHA256 固定（LICENSE / ベンダ済 / 生成物）
- `path.size` — glob 単位のバイト上限（バイナリ・画像・バンドル）
- `path.case_conflict` — 大小違いで衝突するファイル名
- `content.size` — 行数上限（glob + 行カウント）
- `github.actions.permissions` / `triggers` / `runner` / `timeout` / `concurrency` / `consistency` / `secrets` — workflow 構造パース系
- `github.actions.danger` — `pull_request_target` + checkout の footgun
- `github.actions.injection` — `${{ github.event.* }}` の `run:` 直埋め
- `github.codeowners.ownership` — path → owners の一方向整合
- `deps.existence` / `freshness` / `popularity` / `cross_ecosystem` / `typosquat` — レジストリ照合
- `deps.allowed` / `deps.forbidden` — allowlist / denylist
- `deps.install_scripts` — lifecycle hook 検出（Shai-Hulud 等の主要ベクトル）
- `deps.git_dependency` — `git+` / `file:` / URL 直指定
- `deps.floating_version` — `^` / `~` / `*` / `latest` の許容設定
- `git.branch_name` / `git.tag_name` — 命名規約 regex
- `agent.instructions` — AGENTS.md / CLAUDE.md の必須セクション・サイズ・frontmatter
- `agent.mcp` — `.mcp.json` の secret 直埋め禁止・allowlist・非ピン npx 禁止
- `agent.ignore` — `.llmignore` 系の必須カバレッジ

### フィールド拡張

- `path.required` の `companions` を cross-directory 対応
- `path.forbidden` に `type: file | directory | symlink`
- `content.forbidden` / `content.required` に `exclude`
- `content.forbidden` に `bom` / `invisible` / `secret` / `injection` / `conflict` の preset フラグ
- `content.required` に `scope` / `within_lines`
- `github.actions.pinned` の `targets`（action / reusable / docker）

### 横断フィーチャ

- `--diff` スコープフィルタ（`git merge-base` による対象ファイル限定。新ルールではなくフィルタ）
- 終了コード規律（0 pass / 1 violations / 2 config error）

### 設定再編

- `github` namespace の 2 階層化（`github.actions.*` / `github.codeowners.*`）。v0.1.0 のため互換層なしで切替
- 旧 `monban actions` を `monban github` に改名・集約

### 命名統一

- `denied` を廃止し `forbidden` に統合（どちらも「一致したら NG」で同じセマンティクス）
- ルール内フィールドの動詞形（`allow` / `deny` / `forbid` / `require`）を廃止し、形容詞形（`allowed` / `forbidden` / `required`）に統一
- ブール値フラグは動詞接頭辞を避け、名詞のみで表現（`bom` / `injection` / `unpinned_npx` / `env_secrets`）

---

## 不採用

### 原則違反: 言語非依存 / AST 不要

- 関数数・export 数の上限ルール（AST が必要）
- import 方向の制約（layering）— 文字列 regex での近似で十分
- コマンドハンドラの構造的繰り返し検出
- step outputs の未使用検出
- `needs:` の参照整合
- K8s cross-resource（Service → Deployment セレクタ一致）
- Terraform（HCL）/ Jenkinsfile（Groovy）/ Helm テンプレート
- spec-kit / Kiro / Tessl の specs/ レイアウト（規約未統一、6–12 ヶ月待つ）

### 原則違反: 一方向性

- CODEOWNERS: owner → 担当範囲 の割当率
- dependabot の ecosystem 網羅（`package.json` ⇒ npm ecosystem 必須）
- `.env.example` ↔ `.env` の key 一貫性
- `CLAUDE.md` ↔ `AGENTS.md` の内容同期（`doc.ref` で片方を source of truth にする運用で代替）
- AI ignore ファイル間の rule 整合

### 原則違反: 重複排除

- `fail_text` / `docs_url` / remediation JSON（`message` と役割が被る）
- `content.starts_with` 単独ルール（`content.required` の `anchor` + `within_lines` で十分）
- `content.entropy` 単独ルール（`content.forbidden` の `min_entropy` モディファイアで覆う）
- `denied` を独立ルール名として保持すること

### 原則違反: diff 前提

- `path.count` の `diff_max`（差分内の新規追加数上限）
- 「差分で N 個以上新規追加されたら警告」系

### スコープ外

- lockfile の完全依存解決（Dependabot / Renovate の領域）
- CVE スキャン（Snyk / OSV-Scanner の領域）
- インストールスクリプト挙動解析（Socket の領域）
- ライセンスコンプライアンス / SBOM / SLSA 署名検証
- semantic / LLM ベースのコードレビュー
- branch protection / 必須ステータスチェック等の GitHub API 経由設定
- リポジトリトピック / 可視性 / Webhook

### 既存表現で代替可能（docs レシピに留める）

- LICENSE / SECURITY.md / CONTRIBUTING.md / CODE_OF_CONDUCT.md の存在 — `path.required`
- PR / Issue テンプレートの必須セクション — `content.required`
- `dependabot.yml` / `FUNDING.yml` / `labels.yml` / `settings.yml` の key 存在 — `content.required`
- `continue-on-error: true` / `runs-on: self-hosted` 禁止 — `content.forbidden`
- `.gitignore` / `.gitattributes` / `.editorconfig` の必須項目 — `content.required`
- CHANGELOG / README バッジ / shell strict mode — `content.required`
- `.env.example` 必須化 — `path.required`
- `.env` / `id_rsa` コミット検出 — `path.forbidden` + `content.forbidden`
- AGENTS.md の必須セクション個別指定 — `content.required`（`agent.instructions` がプリセット）
- 生成ファイルの `DO NOT EDIT` マーカー — `content.required` の `anchor: start` + `within_lines`
- `.npmrc` / `.yarnrc` / `pip.conf` の https 強制・`ignore-scripts=true` — `content.forbidden` / `required`
- `renovate.json` / `dependabot.yml` / `pre-commit-config.yaml` / `devcontainer.json` の必須フィールド — `content.required`
- docker-compose の `:latest` 禁止・`privileged: true` 禁止 — `content.forbidden`
- Dockerfile の `FROM` ピン留め・`USER root` 禁止・`ADD URL` 禁止 — 行 regex の `content.forbidden` / `content.required`
- prompt injection の不可視文字検出 — `content.forbidden` の `injection: true`
- マージコンフリクトマーカー — `content.forbidden` の `conflict: true`
- lockfile の存在 — `path.required.companions`（manifest → lockfile）
- lockfile 内 URL ホスト allowlist — `content.forbidden` の `json_key`
- 禁止パッケージ名（シンプルなケース）— `content.forbidden` の pattern

### 独立コマンド化せず既存コマンドに吸収

- `monban size` → `content.size`
- `monban encoding` → `content.forbidden`
- `monban branch` → `git.branch_name`
- `monban manifest` / `monban compose` / `monban k8s` → `content.forbidden` + `yaml_key`
- `monban mcp` → `monban agent` に吸収
- `monban security` → `content.forbidden` の preset 群で分散
- `monban registry` → `.npmrc` 等は `content.forbidden` / `required` で
- `monban containers` / `monban docker` → `content.forbidden`（深い検査は hadolint の領域）
- `monban lockfile` → `monban deps` に統合
- `monban config lint`（設定ファイル自身の検証）→ `monban all` 実行時の内部検証で吸収
- `monban pr`（PR タイトル/本文/ラベル検証）→ GitHub API 依存で保留
- `monban stale` → mtime・コミット日時依存で範囲外

### 時期尚早・需要不足

- `content.forbidden` / `required` に `max` / `min`（出現回数）
- `content.order`（複数パターンの出現順序）
- `content.count` 独立ルール
- `tags` + `--tag` フィルタ（ルール総数 50 以下では YAGNI）
- `tags` への `info` severity（error / warn で運用可能）
- preset のコードバンドル機構
- JUnit XML 出力 / reviewdog 直接出力
- SARIF 出力
- severity / baseline / tags スキーマ
- `--sarif` / cron 重複検出（thundering herd）
- `.llmignore` / `.aiexclude` 等の必須化（業界標準未確定）
