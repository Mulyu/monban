# 門番 (monban)

> **日本語** | [English](./README.en.md)

> コーディングエージェントのための番所。コードが関所を通過できるか、門番が確かめる。

**monban** は、コーディングエージェント（Claude Code、Cursor、Copilot など）が生成・編集したコードを、CI やローカルで静的にチェックするハーネス CLI です。

言語非依存・AST 不要。どの言語のプロジェクトでも動作します。

詳しい思想は [docs/concepts.md](docs/concepts.md) を参照してください。

---

## チェック項目

| コマンド | 対象 | ドキュメント |
|---------|------|-------------|
| `monban path` | ファイル・ディレクトリの存在、命名、深度、数 | [docs/path.md](docs/path.md) |
| `monban content` | 正規表現による禁止・必須パターン、BOM、不可視文字、シークレット | [docs/content.md](docs/content.md) |
| `monban doc` | ドキュメントの参照ハッシュ・リンク切れ | [docs/doc.md](docs/doc.md) |
| `monban github` | GitHub ワークフロー（ピン留め・権限・トリガー等）と CODEOWNERS | [docs/github.md](docs/github.md) |
| `monban deps` | マニフェストの依存名をレジストリで実在・鮮度・人気度・類似性で検証 | [docs/deps.md](docs/deps.md) |
| `monban git` | コミットメッセージ・trailer・Issue 参照・変更粒度・ignore すり抜けの検査 | [docs/git.md](docs/git.md) |

PR 差分にスコープを絞る `--diff` フラグは全コマンド共通で使えます（[docs/diff.md](docs/diff.md)）。組織共通ルールの再利用は [docs/extends.md](docs/extends.md) を参照してください。

---

## インストール

```bash
# グローバルインストール
npm install -g @mulyu/monban

# 単発実行（CI 等で推奨）
npx @mulyu/monban all
```

> パッケージ名は `@mulyu/monban` ですが、インストール後のコマンド名は `monban` です。

最短導入手順は [docs/getting-started.md](docs/getting-started.md) を参照してください。

---

## 使い方

```bash
# すべてのチェックを実行
monban all

# チェックを個別に実行
monban path
monban content
monban doc
monban github
monban deps
monban git

# 特定ルールのみ実行
monban path --rule forbidden

# PR 差分にスコープを絞る
monban all --diff=main

# JSON 出力
monban all --json
```

---

## 設定ファイル

プロジェクトルートに `monban.yml` を置きます。各チェックの設定項目は対応するドキュメントを参照してください。

```yaml
# monban.yml
extends:
  - type: local
    path: "./shared/base.yml"

exclude:
  - "**/node_modules/**"
  - "**/dist/**"

path:    { ... }   # docs/path.md
content: { ... }   # docs/content.md
doc:     { ... }   # docs/doc.md
github:  { ... }   # docs/github.md
deps:    { ... }   # docs/deps.md
git:     { ... }   # docs/git.md
```

---

## コーディングエージェントとの統合

### Claude Code

`CLAUDE.md` に以下を追記することで、エージェントが変更後に自動でチェックを走らせるよう促せます。

```markdown
## 変更後の確認

コードを変更したあとは必ず `npx @mulyu/monban all` を実行し、すべてのチェックがパスすることを確認すること。
```

#### プラグインとしての導入（推奨）

Claude Code のマーケットプレイス機能で monban スキルと `/monban:init` コマンドを導入できます。

```text
/plugin marketplace add Mulyu/monban
/plugin install monban@mulyu
/reload-plugins
```

- `monban` スキル: コマンド対応表・出力の読み方・修正ワークフロー・`monban.yml` の書き方をエージェントに供給
- `/monban:init`: 既存プロジェクトを調査して `monban.yml` の雛形を生成

マーケットプレイス manifest は [.claude-plugin/marketplace.json](.claude-plugin/marketplace.json)、プラグイン本体は [plugins/monban/](plugins/monban/)。

### GitHub Actions

```yaml
- name: monban
  run: npx @mulyu/monban all --diff=${{ github.event.pull_request.base.sha }}
```

`--diff` を省けばフル走査になります。PR レビューでは base SHA を渡して差分検査のみ走らせるのが推奨です。

---

## ドキュメント

- [はじめに (getting-started)](docs/getting-started.md)
- [コンセプト (concepts)](docs/concepts.md)
- [ドキュメント索引](docs/README.md)

---

## ライセンス

MIT
