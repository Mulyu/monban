---
description: プロジェクトを調査して monban.yml の雛形を生成する。
---

# /monban:init

現在のリポジトリを軽く調査し、有効化すべき monban コマンド群を選んだ最小 `monban.yml` を提案する。

## 手順

1. **事前チェック**: リポジトリルートに `monban.yml` が既に存在するか確認する
   - 存在する場合: 上書きしない。内容を要約して「既に設定があります」と報告して終了
   - 存在しない場合: 次の手順へ

2. **プロジェクト調査**（各項目は 1 つの tool call で確認）
   - 言語: `package.json` / `pyproject.toml` / `Cargo.toml` / `go.mod` / `Gemfile` などの存在
   - CI: `.github/workflows/` にワークフローがあるか
   - エージェント設定: `AGENTS.md` / `CLAUDE.md` / `.mcp.json` / `.claude/settings.json` / `.cursor/mcp.json` の有無
   - ignore ファイル: `.llmignore` / `.aiexclude` / `.claudeignore` / `.cursorignore` の有無
   - ドキュメント: `docs/` ディレクトリや `*.md` の存在
   - CODEOWNERS: `.github/CODEOWNERS` / `CODEOWNERS` の有無

3. **有効化するコマンドを選ぶ**
   - 常に有効: `path`, `content`, `doc`（低コスト・言語非依存）
   - 依存マニフェスト（`package.json` / `pyproject.toml` / `requirements.txt` / `Cargo.toml` / `go.mod` / `Gemfile`）があれば: `deps`
   - `.github/workflows/` があれば: `github`（actions ルール）。CODEOWNERS があれば `github.codeowners` も
   - `.git/` があれば: `git`（コミットメッセージ検査）
   - エージェント設定ファイルがあれば: `agent`

4. **雛形を生成する**
   - 下の「雛形テンプレート」を土台に、2 と 3 の結果で不要セクションを削除
   - exclude はプロジェクトに応じて調整（`dist/` / `build/` / `target/` / `__pycache__/` など）
   - 初回はすべて `severity: warn` で安全側に倒す。ユーザーが慣れたら error へ昇格する旨をコメントで残す

5. **ユーザー確認**
   - 生成した `monban.yml` の全文を提示し、「この内容でよいか」を確認してから `Write` で保存する
   - 保存後、次の手順として `npx @mulyu/monban all` の実行を案内する

## 雛形テンプレート

```yaml
# monban.yml
# https://github.com/Mulyu/monban
#
# 初回は severity: warn で動作確認し、慣れたら error に昇格すること。

exclude:
  - "**/node_modules/**"
  - "**/dist/**"
  - "**/build/**"

# --- ファイル構造 ---
path:
  forbidden:
    - path: "**/utils/**"
      message: "utils/ は意味が曖昧。適切なモジュール名に分割してください。"
      severity: warn

# --- ファイル内容 ---
content:
  forbidden:
    - path: "**/*"
      conflict: true     # マージコンフリクトマーカー検出
      severity: error
    - path: "**/*"
      secret: true       # シークレット形式の検出
      severity: warn
    - path: "src/**"
      pattern: "(debugger|console\\.log)"
      severity: warn

# --- ドキュメント ---
doc:
  link:
    - path: "*.md"
    - path: "docs/**/*.md"
      severity: warn

# --- 依存パッケージ（マニフェストがある場合のみ） ---
# deps:
#   existence:
#     - path: "package.json"
#       severity: warn
#   freshness:
#     - path: "package.json"
#       min_age_days: 30
#       severity: warn

# --- GitHub Actions（.github/workflows がある場合のみ） ---
# github:
#   actions:
#     pinned:
#       - path: ".github/workflows/*.yml"
#         severity: warn
#     permissions:
#       - path: ".github/workflows/*.yml"
#         required: true
#         severity: warn

# --- Git メタデータ（任意） ---
# git:
#   commit_message:
#     min_length: 20
#     severity: warn

# --- エージェント設定（AGENTS.md / .mcp.json 等がある場合のみ） ---
# agent:
#   mcp:
#     - path: "{.mcp.json,.claude/settings.json,.cursor/mcp.json}"
#       forbidden_commands: [curl, wget, sh, bash, zsh]
#       unpinned_npx: true
#       env_secrets: true
#       severity: error
#   ignore:
#     - path: ".llmignore"
#       severity: warn
```

## 補足

- フィールド一覧や詳細挙動は各コマンドの docs に揃っている（skills/monban の「コマンド対応表」参照）
- 組織共通ルールを使う場合は `extends:` を先頭に追加する（[docs/extends.md](https://github.com/Mulyu/monban/blob/main/docs/extends.md)）
- エージェントは生成完了後に「monban all を実行しますか」と確認し、許可が得られたら `npx @mulyu/monban all` を実行する
