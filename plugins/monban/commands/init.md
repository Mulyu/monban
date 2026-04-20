---
description: プロジェクトを調査して monban.yml の雛形を生成する。
---

# /monban:init

現在のリポジトリを調査し、各ルールをプロジェクトの実態に基づいて設定した `monban.yml` を生成する。

## 手順

1. **事前チェック**: `monban.yml` が既に存在する場合は上書きしない。内容を要約して「既に設定があります」と報告して終了。

2. **プロジェクト調査**（以下をすべて並行で取得する）
   - マニフェスト: `package.json` / `pyproject.toml` / `requirements.txt` / `Cargo.toml` / `go.mod` / `Gemfile` の有無と内容
   - CI: `.github/workflows/` のファイル一覧と全内容
   - docs: `docs/**/*.md` と `*.md` の一覧（README は除く）
   - src 構造: `src/` / `lib/` / `app/` 配下を 3 階層まで ls し、ファイル命名スタイル・ディレクトリ命名スタイル・最大深度・ディレクトリごとのファイル数を確認
   - ファイル行数: ソースファイルの行数最大値を確認
   - Git 履歴: `git log -20 --pretty=%s` でコミット subject の形式を確認
   - ブランチ: `git branch -r` でリモートブランチ名のパターンを確認
   - タグ: `git tag -l` で既存タグ名の形式を確認
   - エージェント設定: `AGENTS.md` / `CLAUDE.md` / `.mcp.json` / `.claude/settings.json` / `.cursor/mcp.json` の有無と内容
   - ignore ファイル: `.llmignore` / `.aiexclude` / `.claudeignore` / `.cursorignore` の有無
   - CODEOWNERS: `.github/CODEOWNERS` / `CODEOWNERS` の有無
   - バージョン指定スタイル: マニフェスト内の `^` / `~` / `*` / ピン留めの比率

3. **ルールごとの設定決定**（下記「ルール別設定ガイド」を参照して各項目を決める）

4. **doc.ref の種マーカー挿入**: `doc.ref` を含める場合、docs ファイルと対応する実装ファイルのペアを 1 組選び、`sha256sum <実装ファイル>` でハッシュを計算し、そのドキュメントの最初の `##` 見出しの直前（なければファイル末尾）に `<!-- monban:ref <実装ファイルへの相対パス> sha256:<hash> -->` を 1 行挿入する。

5. **ユーザー確認**: 生成した `monban.yml` の全文と、挿入した `monban:ref` マーカー（あれば）を提示し、「この内容でよいか」を確認してから保存する。

6. **保存後の案内**: `npx @mulyu/monban all` の実行を案内する。

---

## ルール別設定ガイド

### exclude

| 読む | 値の決め方 |
|------|-----------|
| マニフェストや CI から生成物ディレクトリを確認 | `**/node_modules/**` は常に追加。`dist/` / `build/` / `target/` / `__pycache__/` / `.turbo/` / `.next/` など実際に存在するものを追加 |

---

### path

#### path.forbidden

| 読む | 値の決め方 | スキップ条件 |
|------|-----------|------------|
| `src/` 配下に `utils/` / `helpers/` / `common/` / `shared/` などの曖昧な汎用名ディレクトリがあるか | 存在すれば `message` に代替先のヒントを添えて追加 | 汎用名ディレクトリが存在しない場合はスキップ |
| TypeScript プロジェクトで `.js` が `src/` に混在するか | 混在しているなら拡張子禁止パターンを追加 | |

#### path.required

| 読む | 値の決め方 | スキップ条件 |
|------|-----------|------------|
| `src/rules/*` / `packages/*` など繰り返し単位があるか | 各単位に一貫して存在するファイルを `files:` に列挙 | パターンが見つからない場合はスキップ |
| ソースファイルにペアのテストファイルが一貫して存在するか | 存在するなら `companions:` で定義 | テスト配置が不規則ならスキップ |

#### path.naming

| 読む | 値の決め方 | スキップ条件 |
|------|-----------|------------|
| 各ディレクトリ配下のファイル名・ディレクトリ名を 20 件程度抽出し、pascal / camel / kebab / snake のいずれが支配的かを判定 | 80% 以上が同一スタイルなら `style:` を設定 | バラつきが大きく判定できない場合はスキップ |

#### path.depth

| 読む | 値の決め方 | スキップ条件 |
|------|-----------|------------|
| 現在の最大ディレクトリ深度を確認 | 現在の最大値 + 1〜2 を `max:` に設定（今ある構造を壊さずに今後の過剰なネストを抑止） | 最大深度が 2 以下なら スキップ |

#### path.count

| 読む | 値の決め方 | スキップ条件 |
|------|-----------|------------|
| ディレクトリごとのファイル数を確認し、30 超のディレクトリを特定 | 現在の最多ファイル数 + 10〜20 を `max:` に設定 | 最多が 20 以下ならスキップ |

#### path.size / path.hash / path.case_conflict

スキップ。初回 init では含めない（バイナリや画像が存在する場合のみ `size` を追加、その他は問題が顕在化してから追加）。

---

### content

#### content.forbidden（ハイジェニック系）

以下は言語非依存のため、常に含める。

```yaml
content:
  forbidden:
    - path: "**/*"
      conflict: true
      severity: error
    - path: "**/*"
      secret: true
      severity: warn
    - path: "**/*"
      invisible: true
      severity: warn
```

#### content.forbidden（デバッグコード）

| 読む | 値の決め方 | スキップ条件 |
|------|-----------|------------|
| 使用言語を確認 | TypeScript/JS なら `src/**` に `(debugger\|console\.log)`、Python なら `pdb\.set_trace`、Go なら `fmt\.Println` を `severity: warn` で追加 | 言語が判定できない場合はスキップ |

#### content.forbidden（プロンプトインジェクション）

| 読む | 値の決め方 | スキップ条件 |
|------|-----------|------------|
| `AGENTS.md` / `CLAUDE.md` / `.mcp.json` / `*.md` があるか | あれば `injection: true` を追加 | 対象ファイルが 1 つも存在しない場合はスキップ |

#### content.required

スキップ。コピーライトヘッダ等のプロジェクト固有必須テキストが確認できる場合のみ追加する。

#### content.size

| 読む | 値の決め方 | スキップ条件 |
|------|-----------|------------|
| ソースファイルの行数最大値を確認 | 現在の最大値 + 100 を `max_lines:` に設定（既存ファイルを即座に違反させない） | 最大 300 行以下ならスキップ |

---

### doc

#### doc.ref

| 読む | 値の決め方 | スキップ条件 |
|------|-----------|------------|
| `docs/**/*.md` があるか。各 md のタイトルや見出しから対応する実装ファイルを特定（例: `docs/path.md` → `src/rules/path/` 配下の主要ファイル） | ペアが特定できれば、手順 4 の指示に従って種マーカーを 1 件挿入し、`doc.ref` を設定する | docs が存在しない場合、またはドキュメントと実装の対応が読み取れない場合はスキップ |

#### doc.link

| 読む | 値の決め方 | スキップ条件 |
|------|-----------|------------|
| `docs/` や `*.md` ファイルがあるか | あれば `path: "docs/**/*.md"` と `path: "*.md"` を追加 | docs が存在しない場合はスキップ |

---

### deps

マニフェストが 1 つも見つからない場合、このセクション全体をスキップ。

#### deps.existence

| 読む | 値の決め方 |
|------|-----------|
| 存在するマニフェストのパス | 見つかったマニフェストごとに 1 エントリ追加 |

#### deps.freshness

| 読む | 値の決め方 |
|------|-----------|
| マニフェストの種類 | `max_age_hours: 168`（7 日）、`severity: warn` で固定設定 |

#### deps.typosquat

| 読む | 値の決め方 |
|------|-----------|
| マニフェストの種類 | `max_distance: 2`、`severity: warn` で固定設定 |

#### deps.popularity

| 読む | 値の決め方 |
|------|-----------|
| マニフェストの種類 | `min_downloads: 100`、`severity: warn` で固定設定 |

#### deps.cross_ecosystem

| 読む | 値の決め方 |
|------|-----------|
| マニフェストの種類 | `severity: warn` で固定設定 |

#### deps.install_scripts

| 読む | 値の決め方 | スキップ条件 |
|------|-----------|------------|
| `package.json` の `scripts:` に `prepare` があるか（Husky 等） | `prepare` のみ使っている場合は `forbidden: [preinstall, install, postinstall]` で `prepare` を除外。それ以外はデフォルト（全禁止） | `package.json` がない場合はスキップ |

#### deps.git_dependency

| 読む | 値の決め方 | スキップ条件 |
|------|-----------|------------|
| マニフェスト内に `git+` / `file:` / `github:` 等の指定があるか | ない場合でも予防的に `severity: warn` で追加してよい | マニフェストがない場合はスキップ |

#### deps.floating_version

| 読む | 値の決め方 | スキップ条件 |
|------|-----------|------------|
| バージョン指定で `^` / `~` / `*` の比率を確認 | `severity: warn` で設定。社内スコープ（`@myorg/*` 等）があれば `allowed:` に追加 | マニフェストがない場合はスキップ |

---

### github

`.github/workflows/` がなければこのセクション全体をスキップ。

#### github.actions.pinned

| 読む | 値の決め方 |
|------|-----------|
| 既存ワークフロー内 `uses:` が SHA ピン済みか | ピンされていなければ `severity: warn`。すでにほぼピン済みなら `severity: error` |

#### github.actions.permissions

常に追加（未宣言は GITHUB_TOKEN 広域化につながる）。`severity: warn`。

#### github.actions.triggers

常に `forbidden: ["pull_request_target"]` を追加。`severity: warn`。

#### github.actions.runner

| 読む | 値の決め方 | スキップ条件 |
|------|-----------|------------|
| `runs-on:` で使われているランナーラベルを全ワークフローから抽出 | 使用中のラベルを `allowed:` に列挙。`severity: warn` | `${{ matrix.* }}` 等の動的指定が多くラベルが特定できない場合はスキップ |

#### github.actions.timeout

| 読む | 値の決め方 |
|------|-----------|
| 既存の `timeout-minutes:` の値を抽出 | 現在の最大値を `max:` に設定。設定なしの場合は 30 をデフォルトとして設定。`severity: warn` |

#### github.actions.concurrency

常に追加（冗長ビルド抑止）。`severity: warn`。

#### github.actions.secrets

| 読む | 値の決め方 | スキップ条件 |
|------|-----------|------------|
| ワークフロー内の `${{ secrets.X }}` 参照を全抽出 | 使用中のシークレット名を `allowed:` に列挙 | シークレット参照が 0 件の場合はスキップ |

#### github.actions.danger / github.actions.injection

常に追加（セキュリティ安全策）。`severity: warn`。

#### github.actions.consistency

| 読む | 値の決め方 | スキップ条件 |
|------|-----------|------------|
| 複数ワークフローで使われているアクションを確認 | 2 ファイル以上で参照されているアクションを `actions:` に列挙 | ワークフローが 1 ファイルのみならスキップ |

#### github.actions.required / github.actions.forbidden

スキップ。組織固有の要件が明確になった時点で追加する。

#### github.codeowners.ownership

| 読む | 値の決め方 | スキップ条件 |
|------|-----------|------------|
| CODEOWNERS が存在し特定パスのオーナーが定義されているか | 重要パスを 1〜2 件設定例として追加 | CODEOWNERS が存在しない場合はスキップ |

---

### git

#### git.commit.message

| 読む | 値の決め方 | スキップ条件 |
|------|-----------|------------|
| `git log -20 --pretty=%s` で直近 20 件の subject を確認。conventional 形式（`feat:` / `fix:` / `chore:` 等）が 80% 以上か | 該当するなら `preset: conventional`、`subject_max_length: 72`、`severity: warn`。少ない場合は `subject_max_length: 72` のみ設定 | |

#### git.commit.trailers / git.commit.references

スキップ。組織ポリシーによるため初期設定に含めない。

#### git.diff.size

| 読む | 値の決め方 |
|------|-----------|
| マージ履歴から PR の変更規模を推定 | 中央値の 2 倍程度を `max_total_lines:` に設定（履歴がない場合は 1500）。lockfile は `exclude:` に含める。`severity: warn` |

#### git.diff.ignored

常に追加（`.gitignore` すり抜け検出）。`scope: diff`、`severity: warn`。

#### git.branch_name

| 読む | 値の決め方 | スキップ条件 |
|------|-----------|------------|
| `git branch -r` で現在のリモートブランチ名を確認し共通パターンを抽出 | パターンが見えれば regex に変換して `pattern:` に設定。`allowed: ["main", "develop"]` 等を追加。`severity: warn` | バラバラでパターンが見えない場合はスキップ |

#### git.tag_name

| 読む | 値の決め方 | スキップ条件 |
|------|-----------|------------|
| `git tag -l` でタグが存在し SemVer 形式か確認 | SemVer が支配的なら `pattern: "^v\\d+\\.\\d+\\.\\d+(-[a-z0-9.]+)?$"`、`severity: warn` | タグが 0 件の場合はスキップ |

---

### agent

エージェント設定ファイル（`AGENTS.md` / `CLAUDE.md` / `.mcp.json` / `.claude/settings.json` / `.cursor/mcp.json` / `.llmignore` 等）が 1 つも見つからない場合、このセクション全体をスキップ。

#### agent.instructions

| 読む | 値の決め方 | スキップ条件 |
|------|-----------|------------|
| `AGENTS.md` / `CLAUDE.md` が存在するか。存在する場合の H2 見出し一覧を確認 | 見出しが一貫しているなら `required_sections:` に列挙。ファイルサイズが 10 KB 超なら `max_bytes: 12288` を設定。`severity: warn` | ファイルが存在しない場合はスキップ |

#### agent.mcp

| 読む | 値の決め方 | スキップ条件 |
|------|-----------|------------|
| `.mcp.json` / `.claude/settings.json` / `.cursor/mcp.json` のいずれかが存在するか | `forbidden_commands: [curl, wget]`（ネット取得系のみ。シェル系は許容）、`unpinned_npx: true`、`env_secrets: true`、`severity: warn` で設定 | 対象ファイルが 1 つも存在しない場合はスキップ |

#### agent.ignore

| 読む | 値の決め方 | スキップ条件 |
|------|-----------|------------|
| `.llmignore` / `.aiexclude` / `.claudeignore` / `.cursorignore` のいずれかが存在するか | 存在する最初の 1 つを `path:` に設定し、`.env`、`.env.*`、`*.pem`、`id_rsa`、`**/secrets/**` を `required:` に追加。`severity: warn` | 1 つも存在しない場合はスキップ |

---

## 組み立て

上記ガイドで決定した項目のみを含む `monban.yml` を生成する。スキップ条件に該当した項目は含めない。コメントアウトは使わない。

## 補足

- フィールド一覧や詳細挙動は各コマンドの docs に揃っている（skills/monban の「コマンド対応表」参照）
- 組織共通ルールを使う場合は `extends:` を先頭に追加する（[docs/extends.md](https://github.com/Mulyu/monban/blob/main/docs/extends.md)）
