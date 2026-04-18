# 門番 (monban)

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
| `monban actions` | GitHub Actions のピン留め・必須/禁止アクション | [docs/actions.md](docs/actions.md) |

組織共通ルールの再利用は [docs/extends.md](docs/extends.md) を参照してください。

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
monban actions

# 特定ルールのみ実行
monban path --rule forbidden

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

path:     { ... }   # docs/path.md
content:  { ... }   # docs/content.md
doc:      { ... }   # docs/doc.md
actions:  { ... }   # docs/actions.md
```

---

## コーディングエージェントとの統合

### Claude Code

`CLAUDE.md` に以下を追記することで、エージェントが変更後に自動でチェックを走らせるよう促せます。

```markdown
## 変更後の確認

コードを変更したあとは必ず `npx @mulyu/monban all` を実行し、すべてのチェックがパスすることを確認すること。
```

### GitHub Actions

```yaml
- name: monban
  run: npx @mulyu/monban all
```

---

## ドキュメント

- [はじめに (getting-started)](docs/getting-started.md)
- [コンセプト (concepts)](docs/concepts.md)
- [ドキュメント索引](docs/README.md)

---

## ライセンス

MIT
