# 機能追加の判断記録

monban の機能追加検討の履歴。採用・不採用にかかわらず候補と理由を残す。判断の手順は [`SKILL.md`](./SKILL.md) の「機能追加の進め方」を参照。

新しい判断はこのテーブルに 1 行追記する。並びは「コマンド → ルール → フィールド拡張 → 横断 → 設定再編 → 命名 → 対称化 → 配布形態 → 不採用（原則違反・スコープ外・代替可能・吸収・時期尚早）」の順。

| 機能 | 内容 | 結論 | 理由 |
|---|---|---|---|
| `monban path` | パス構造（存在・命名・深度・数・ハッシュ・サイズ・大小衝突） | 採用 | パス層の検査をコマンド単位で束ねる |
| `monban content` | ファイル内容（正規表現・BOM・不可視文字・秘密情報・injection・マージコンフリクト・行数） | 採用 | プレーンテキスト検査をコマンド単位で束ねる |
| `monban doc` | ドキュメントと参照先のハッシュ整合・リンク切れ | 採用 | docs ↔ src の drift 検出 |
| `monban github` | GitHub 特有ファイル（workflows / CODEOWNERS）。旧 `monban actions` を集約 | 採用 | YAML 構造パースを必要とする検査を束ねる |
| `monban deps` | 依存パッケージの実在・鮮度・人気度・類似性・供給網リスク | 採用 | マニフェスト + 外部レジストリ照合 |
| `monban git` | コミットメッセージ・trailer・Issue 参照・変更粒度・ignore すり抜け・ブランチ名・タグ名 | 採用 | Git メタデータ検査を束ねる |
| `monban agent` | エージェント向け設定（AGENTS.md / CLAUDE.md / MCP / AI ignore） | 採用 | 2025–2026 年の MCP / prompt injection CVE 対応 |
| `monban runtime` | 複数ファイルに散らばるランタイムバージョン指定（`.nvmrc` / `engines` / `Dockerfile FROM` / GHA matrix）の N→1 整合 | 採用 | `github.actions.consistency` の発想を file-type 横断に汎用化。判定手段は「source 単位の値抽出（trim / pattern / json_key / yaml_key）+ 集合比較」で既存と異なる |
| `path.count` | glob 単位の min/max ファイル数 | 採用 | ls-lint の `exists: N-M` 相当 |
| `path.hash` | 単一ファイル SHA256 固定 | 採用 | LICENSE / ベンダ済 / 生成物の改竄検知 |
| `path.size` | glob 単位のバイト上限 | 採用 | バイナリ・画像・バンドルの肥大化検知 |
| `path.case_conflict` | 大小違いで衝突するファイル名 | 採用 | macOS/Windows 破壊対策 |
| `content.size` | 行数上限（glob + 行カウント） | 採用 | 巨大ファイル抑止 |
| `github.actions.permissions` | `permissions:` ブロックの YAML 構造パース | 採用 | GITHUB_TOKEN 広域化の抑止 |
| `github.actions.triggers` | `on:` イベントの allowlist / denylist | 採用 | `pull_request_target` 等の危険トリガ抑止 |
| `github.actions.runner` | `runs-on:` の allowlist / denylist | 採用 | コスト / セキュリティでランナー制限 |
| `github.actions.timeout` | 全 job に `timeout-minutes:` 必須 | 採用 | ランナー費用暴走の抑止 |
| `github.actions.concurrency` | workflow 単位での宣言必須 | 採用 | 冗長ビルド抑止 |
| `github.actions.consistency` | 複数ファイル横断でバージョン一致 | 採用 | 取り残し検知 |
| `github.actions.secrets` | `${{ secrets.X }}` 参照の allowlist / denylist | 採用 | タイポ / 未定義参照の静的検出 |
| `github.actions.danger` | `pull_request_target` + checkout の footgun | 採用 | tj-actions/changed-files 後の OpenSSF ハードニング対応 |
| `github.actions.injection` | `${{ github.event.* }}` の `run:` 直埋め | 採用 | GitHub security hardening が最悪経路と明示 |
| `github.codeowners.ownership` | path → owners の一方向整合 | 採用 | 片方向性を保てる |
| `deps.existence` | hallucination / slopsquat 検出（レジストリ照合） | 採用 | LLM 生成コードの 5〜21% が hallucination という研究 |
| `deps.freshness` | 公開から閾値以内の新規パッケージ | 採用 | slopsquat のターゲット抑止 |
| `deps.popularity` | 週間ダウンロード数が閾値未満 | 採用 | マイナーパッケージのリスク抑止 |
| `deps.cross_ecosystem` | 別エコシステムにしか存在しない名前の要求 | 採用 | 言語取り違えの典型痕跡 |
| `deps.typosquat` | 人気パッケージと編集距離が近い類似名 | 採用 | typosquat 検出 |
| `deps.allowed` / `deps.forbidden` | allowlist / denylist | 採用 | 組織の承認済みリスト運用 |
| `deps.install_scripts` | lifecycle hook 検出 | 採用 | Shai-Hulud 等の主要ベクトル（npm 攻撃の 72%） |
| `deps.git_dependency` | `git+` / `file:` / URL 直指定 | 採用 | レジストリ監査が効かない経路の抑止 |
| `deps.floating_version` | `^` / `~` / `*` / `latest` の許容設定 | 採用 | 侵害時に自動被弾する設定そのものを検出 |
| `git.branch_name` / `git.tag_name` | 命名規約 regex | 採用 | エージェントが作る一時ブランチ名の揃え |
| `agent.instructions` | AGENTS.md / CLAUDE.md の必須セクション・サイズ・frontmatter | 採用 | エージェント指示書の品質担保 |
| `agent.mcp` | `.mcp.json` の secret 直埋め禁止・allowlist・非ピン npx 禁止 | 採用 | MCP 関連 CVE 対応 |
| `agent.settings` | `.claude/settings.json` の `permissions.allow` 広域許可・`hooks.*.command` の危険シェル・非ピン npx を検出 | 採用 | ハーネス本体の権限/フックは `agent.mcp` の `mcpServers` 範囲外。自律運用時にエージェントが `Bash(*)` / curl パイプを設定に潜り込ませる経路の遮断 |
| `agent.ignore` | `.llmignore` 系の必須カバレッジ | 採用 | `.env*` / `*.pem` / `id_rsa` の AI 流出抑止 |
| `path.required.companions` の cross-directory | 別ディレクトリの随伴ファイル指定 | 採用 | `src/x.rb` → `spec/x_spec.rb` 等の表現 |
| `path.forbidden.type` | `file` / `directory` / `symlink` の種別絞り込み | 採用 | symlink 単独禁止など |
| `content.forbidden` / `content.required` の `exclude` | 除外 glob | 採用 | 特定ディレクトリのみ例外扱い |
| `content.forbidden` の `bom` / `invisible` / `secret` / `injection` / `conflict` | プリセット検査フラグ | 採用 | 独立ルール化せずフィールド拡張で表現 |
| `content.required` の `scope` / `within_lines` | マッチ範囲の限定 | 採用 | 先頭 N 行ヘッダ検査 |
| `content.forbidden` / `content.required` の `json_key` | JSON 内のドット区切りキーパスに対する pattern マッチ／存在検査。末尾 `*` で 1 階層ワイルドカード | 採用 | `package.json` の `scripts.*` 危険操作検出、lockfile の URL ホスト allowlist など、独立ルールを立てずに表現するための前提として必要だった |
| `github.actions.pinned.targets` | action / reusable / docker の切替 | 採用 | 対象種別ごとにピン留め判定 |
| `--diff` スコープフィルタ | `git merge-base` で対象ファイル限定 | 採用 | 新ルールではなくフィルタ。差分前提の判定は作らない |
| 終了コード規律 | 0 pass / 1 violations / 2 config error | 採用 | CI 統合に必須 |
| `github` namespace の 2 階層化 | `github.actions.*` / `github.codeowners.*` | 採用 | v0.1.0 のため互換層なしで切替 |
| `monban actions` → `monban github` | 旧コマンドのリネーム・集約 | 採用 | codeowners を同コマンドに入れるため |
| `denied` 廃止 | `forbidden` に統合 | 採用 | 「一致したら NG」で同セマンティクス |
| 動詞形フィールド廃止 | `allow` / `deny` / `forbid` / `require` → `allowed` / `forbidden` / `required` | 採用 | 語彙統一 |
| ブール値フラグの名詞化 | `bom` / `injection` / `unpinned_npx` / `env_secrets` | 採用 | 動詞接頭辞の回避 |
| `agent.ignore.must_cover` → `required` | 「含まれていなければ違反」= required セマンティクス | 採用 | 語彙統一 |
| `deps.install_scripts.hooks` → `forbidden` | 「宣言されていたら違反」= forbidden セマンティクス | 採用 | 語彙統一 |
| `agent.instructions.frontmatter_keys` → `allowed_frontmatter_keys` | 実態は allowlist | 採用 | 語彙明示 |
| `github.actions.runner.forbidden` 追加 | `self-hosted` 単独禁止を簡潔に | 採用 | `allowed` と対称化 |
| `github.actions.secrets.forbidden` 追加 | 退役シークレット名の明示禁止 | 採用 | `allowed` と対称化 |
| `git.branch_name.forbidden` 追加 | `wip/` `tmp/` 等を regex denylist で禁止 | 採用 | `pattern` は allowlist 的なので denylist が別途必要 |
| `git.tag_name.allowed` / `forbidden` 追加 | 既存非準拠タグの個別免除・beta/rc 等の禁止 | 採用 | `branch_name` と API 対称 |
| `runtime.consistency` | `name` + `sources[]` で多ファイルの抽出値を集合比較。各 source は `pattern` / `json_key` / `yaml_key` / trim から 1 つ選択 | 採用 | `github.actions.consistency` と同じ N→1 セマンティクス。直交する関心領域なので独立コマンド化 |
| `runtime.consistency` の `extract` 後処理 | json_key/yaml_key で取り出した値に regex を後適用して正規化 | 不採用 | 時期尚早。pattern を直接書けば代替可能 |
| `monban model` | AI モデル名のハルシネーション/退役/非ピン検出 | 不採用 | 検討時の対案。「外部 API 例外は deps のみ」原則を新たに拡張する重みがある。需要顕在化まで保留 |
| `monban i18n` | 多言語リソースファイルの key 集合差検出 | 不採用 | ニッチ。多言語アプリ限定で AI 時代の本流ではない |
| `deps.floating_version.allowed` 追加 | 社内 `@myorg/*` のみ浮動を許す | 採用 | 例外表現が欠落していた |
| `github.actions.forbidden.uses` 配列許容 | 1 ルールで複数禁止アクション列挙 | 採用 | 表現力の改善 |
| Claude Code プラグイン化 | `plugins/monban/` に skill + `/monban:init` を同梱 | 採用 | マーケットプレイスは同一リポ + release-please `extra-files` で同期 |
| スキルは単一 `monban` | コマンド別分割はしない | 採用 | 「重複排除」に反する。全体マップ + docs リンクで十分 |
| 関数数・export 数の上限ルール | AST が必要 | 不採用 | 言語非依存原則違反 |
| import 方向の制約（layering） | 文字列 regex での近似で十分 | 不採用 | 言語非依存原則違反 |
| コマンドハンドラの構造的繰り返し検出 | 正規表現・glob の範疇を超える | 不採用 | 言語非依存原則違反 |
| step outputs の未使用検出 | 変数フロー解析が必要 | 不採用 | AST 的発想 |
| `needs:` の参照整合 | 型検査に近く YAML 構造依存度が高い | 不採用 | 言語非依存原則違反 |
| K8s cross-resource（Service → Deployment セレクタ一致） | 意味論グラフ | 不採用 | 言語非依存原則違反 |
| Terraform（HCL）/ Jenkinsfile（Groovy）/ Helm テンプレート | AST / テンプレート展開が必要 | 不採用 | 言語非依存原則違反 |
| spec-kit / Kiro / Tessl の specs/ レイアウト | 規約未統一 | 不採用 | 6–12 ヶ月待つ |
| CODEOWNERS: owner → 担当範囲 の割当率 | 双方向になる | 不採用 | 一方向性原則違反 |
| dependabot の ecosystem 網羅 | ファイル A の存在からファイル B の内容を要求 | 不採用 | 一方向性原則違反 |
| `.env.example` ↔ `.env` の key 一貫性 | 両ファイル間の双方向チェック | 不採用 | 一方向性原則違反 |
| `CLAUDE.md` ↔ `AGENTS.md` の内容同期 | `doc.ref` で片方を source of truth に | 不採用 | 既存表現で代替可能 |
| AI ignore ファイル間の rule 整合 | `.aiexclude` と `.cursorignore` の差分禁止 | 不採用 | 一方向性原則違反 |
| `fail_text` / `docs_url` / remediation JSON | `message` と役割が被る | 不採用 | 重複排除原則違反 |
| `content.starts_with` 単独ルール | `content.required` の `anchor` + `within_lines` で十分 | 不採用 | 重複排除原則違反 |
| `content.entropy` 単独ルール | `content.forbidden` の `min_entropy` モディファイア | 不採用 | 重複排除原則違反 |
| `denied` を独立ルール名として保持 | `forbidden` と同セマンティクス | 不採用 | 重複排除原則違反 |
| `path.count.diff_max` | 差分前提の判定 | 不採用 | フル走査で意味を持たない |
| 「差分に N 個以上追加で警告」系 | 差分前提の判定 | 不採用 | 同上 |
| 別リポジトリ `Mulyu/monban-marketplace` | CLI とプラグインの version drift リスク | 不採用 | 同梱 + release-please `extra-files` の方が堅牢 |
| コマンド別スキル分割（`monban-path` 等 7 個） | スキル分割案 | 不採用 | 重複排除違反。エージェントが欲しいのは全体マップ |
| PostToolUse フックで Edit/Write 後に自動 `monban all` | 毎編集で自動実行 | 不採用 | 侵襲的。CI + ローカル明示実行が前提 |
| `/monban:check` スラッシュコマンド | `npx @mulyu/monban all` の単純ラップ | 不採用 | 価値ゼロ |
| `/monban:fix` スラッシュコマンド | 修正ワークフロー | 不採用 | スキル本文と重複 |
| monban の MCP server 化 | 外部呼び出し用 | 不採用 | エージェント内ループでは Bash で十分 |
| `thinking` / `direction` を同一プラグインに同梱 | 汎用スキルの混入 | 不採用 | 将来 `mulyu` マーケットプレイスの別プラグインに切り出す |
| lockfile の完全依存解決 | | 不採用 | Dependabot / Renovate の領域 |
| CVE スキャン | | 不採用 | Snyk / OSV-Scanner の領域 |
| インストールスクリプト挙動解析 | | 不採用 | Socket の領域 |
| ライセンスコンプライアンス / SBOM / SLSA 署名検証 | | 不採用 | cargo-deny / licensee / in-toto の領域 |
| semantic / LLM ベースのコードレビュー | | 不採用 | Claude Code Review / Codacy の領域 |
| branch protection / 必須ステータスチェック等 | | 不採用 | GitHub API 経由。monban は file-system only |
| リポジトリトピック / 可視性 / Webhook 設定 | | 不採用 | 同上 |
| LICENSE / SECURITY.md / CONTRIBUTING.md / CODE_OF_CONDUCT.md の存在 | | 不採用 | `path.required` で表現 |
| PR / Issue テンプレートの必須セクション | | 不採用 | `content.required` で表現 |
| `dependabot.yml` / `FUNDING.yml` / `labels.yml` / `settings.yml` の key 存在 | | 不採用 | `content.required` で表現 |
| `continue-on-error: true` / `runs-on: self-hosted` 禁止 | | 不採用 | `content.forbidden` で表現 |
| `.gitignore` / `.gitattributes` / `.editorconfig` の必須項目 | | 不採用 | `content.required` で表現 |
| CHANGELOG / README バッジ / shell strict mode | | 不採用 | `content.required` で表現 |
| `.env.example` 必須化 | | 不採用 | `path.required` で表現 |
| `.env` / `id_rsa` コミット検出 | | 不採用 | `path.forbidden` + `content.forbidden` で表現 |
| AGENTS.md の必須セクション個別指定 | | 不採用 | `content.required`（`agent.instructions` がプリセット） |
| 生成ファイルの `DO NOT EDIT` マーカー | | 不採用 | `content.required` の `anchor: start` + `within_lines` で表現 |
| `.npmrc` / `.yarnrc` / `pip.conf` の https 強制・`ignore-scripts=true` | | 不採用 | `content.forbidden` / `content.required` で表現 |
| `renovate.json` / `dependabot.yml` / `pre-commit-config.yaml` / `devcontainer.json` の必須フィールド | | 不採用 | `content.required` で表現 |
| docker-compose の `:latest` 禁止・`privileged: true` 禁止 | | 不採用 | `content.forbidden` で表現 |
| Dockerfile の `FROM` ピン留め・`USER root` 禁止・`ADD URL` 禁止 | | 不採用 | 行 regex の `content.forbidden` / `content.required` で表現 |
| prompt injection の不可視文字検出 | | 不採用 | `content.forbidden` の `injection: true` で表現 |
| マージコンフリクトマーカー | | 不採用 | `content.forbidden` の `conflict: true` で表現 |
| lockfile の存在 | | 不採用 | `path.required.companions`（manifest → lockfile）で表現 |
| lockfile 内 URL ホスト allowlist | | 不採用 | `content.forbidden` の `json_key` で表現 |
| 禁止パッケージ名（シンプルなケース） | | 不採用 | `content.forbidden` の pattern で表現 |
| `monban size` | 独立コマンド化 | 不採用 | `content.size` に吸収 |
| `monban encoding` | 独立コマンド化 | 不採用 | `content.forbidden` に吸収 |
| `monban branch` | 独立コマンド化 | 不採用 | `git.branch_name` に吸収 |
| `monban manifest` / `monban compose` / `monban k8s` | 独立コマンド化 | 不採用 | `content.forbidden` + `yaml_key` に吸収 |
| `monban mcp` | 独立コマンド化 | 不採用 | `monban agent` に吸収 |
| `monban security` | 独立コマンド化 | 不採用 | `content.forbidden` の preset 群で分散 |
| `monban registry` | 独立コマンド化 | 不採用 | `content.forbidden` / `content.required` に吸収 |
| `monban containers` / `monban docker` | 独立コマンド化 | 不採用 | `content.forbidden` に吸収（深い検査は hadolint の領域） |
| `monban lockfile` | 独立コマンド化 | 不採用 | `monban deps` に吸収 |
| `monban config lint` | 独立コマンド化 | 不採用 | `monban all` 実行時の内部検証で吸収 |
| `monban pr`（PR タイトル/本文/ラベル検証） | 独立コマンド化 | 不採用 | GitHub API 依存で保留 |
| `monban stale` | 独立コマンド化 | 不採用 | mtime・コミット日時依存で範囲外 |
| `content.forbidden` / `required` の `max` / `min`（出現回数） | | 不採用 | 時期尚早（需要顕在化まで保留） |
| `content.order`（複数パターンの出現順序） | | 不採用 | 時期尚早 |
| `content.count` 独立ルール | | 不採用 | 時期尚早 |
| `tags` + `--tag` フィルタ | | 不採用 | 時期尚早（ルール総数 50 以下では YAGNI） |
| `tags` への `info` severity | | 不採用 | 時期尚早（error / warn で運用可能） |
| preset のコードバンドル機構 | | 不採用 | 時期尚早（docs の設定例で十分） |
| JUnit XML 出力 / reviewdog 直接出力 | | 不採用 | 時期尚早（GitHub 主軸なら SARIF で足りる） |
| SARIF 出力 | | 不採用 | 範囲外（user 方針） |
| severity / baseline / tags スキーマ | | 不採用 | 範囲外（user 方針） |
| cron 重複検出（thundering herd） | | 不採用 | 実害判定が曖昧 |
| `.llmignore` / `.aiexclude` 等の必須化 | | 不採用 | 業界標準未確定 |
