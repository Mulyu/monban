# monban ドキュメント

> **日本語** | [English](./README.md)

monban のユーザー向けドキュメント索引。

## はじめに

- [getting-started.md](getting-started.ja.md) — インストールから初回実行までの最短手順
- [concepts.md](concepts.ja.md) — 設計思想と他リンターとの棲み分け

## チェックリファレンス

| ドキュメント | 内容 |
|-------------|------|
| [path.md](path.ja.md) | パス構造（`forbidden` / `required` / `naming` / `depth` / `count`） |
| [content.md](content.ja.md) | ファイル内容（`forbidden` / `required`、BOM・不可視文字・シークレット） |
| [doc.md](doc.ja.md) | ドキュメント整合性（`ref` / `link`） |
| [github.md](github.ja.md) | GitHub（workflows + CODEOWNERS、13 ルール） |
| [deps.md](deps.ja.md) | 依存パッケージ（`existence` / `freshness` / `popularity` / `cross_ecosystem` / `typosquat` / `allowed` / `forbidden`） |
| [git.md](git.ja.md) | Git メタデータ（`commit.message` / `commit.trailers` / `commit.references` / `diff.size` / `diff.ignored` / `branch_name` / `tag_name`） |
| [agent.md](agent.ja.md) | AI エージェント設定（`instructions` / `mcp` / `ignore`） |
| [runtime.md](runtime.ja.md) | ランタイムバージョン指定の複数ファイル整合（`consistency`） |

## CLI

- [diff.md](diff.ja.md) — 全コマンド共通の `--diff` フラグ（PR 差分スコープ）

## 設定

- [extends.md](extends.ja.md) — 他の YAML 設定の継承（local / GitHub）
