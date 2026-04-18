# monban ドキュメント

monban のユーザー向けドキュメント索引。

## はじめに

- [getting-started.md](getting-started.md) — インストールから初回実行までの最短手順
- [concepts.md](concepts.md) — 設計思想と他リンターとの棲み分け

## チェックリファレンス

| ドキュメント | 内容 |
|-------------|------|
| [path.md](path.md) | パス構造（`forbidden` / `required` / `naming` / `depth` / `count`） |
| [content.md](content.md) | ファイル内容（`forbidden` / `required`、BOM・不可視文字・シークレット） |
| [doc.md](doc.md) | ドキュメント整合性（`ref` / `link`） |
| [github.md](github.md) | GitHub（workflows + CODEOWNERS、11 ルール） |
| [deps.md](deps.md) | 依存パッケージ（`existence` / `freshness` / `popularity` / `cross_ecosystem` / `typosquat` / `allowed` / `denied`） |

## CLI

- [diff.md](diff.md) — 全コマンド共通の `--diff` フラグ（PR 差分スコープ）

## 設定

- [extends.md](extends.md) — 他の YAML 設定の継承（local / GitHub）
