---
name: monban
description: monban CLI (@mulyu/monban) の実行・出力解釈・monban.yml 編集を支援する。プロジェクトに monban.yml があるとき、monban コマンドを実行・修正するとき、monban の違反出力を読むとき、monban 導入を検討しているときに使用する。
---

# monban の使い方

monban は AI エージェントが生成・編集したコードを CI やローカルで静的にチェックする言語非依存の CLI。検出のみ行い修正はしない。詳細仕様は [GitHub の docs/](https://github.com/Mulyu/monban/tree/main/docs) を単一ソースとする。

## 実行

```bash
npx @mulyu/monban all                          # 全チェック
npx @mulyu/monban <command>                    # コマンド単位
npx @mulyu/monban <command> --rule <name>      # ルール単位
npx @mulyu/monban all --diff=<base>            # PR 差分にスコープ限定
npx @mulyu/monban all --json                   # JSON 出力
```

## コマンド対応表

<!-- monban:ref ../../../../docs/path.md sha256:4a0a42c0a50f75679e99e25c9b929f7a07a208866e61fa4838c888c296ae18a5 -->
<!-- monban:ref ../../../../docs/content.md sha256:3b2a1eb9357f0fcf9d308c67e5b210f3a159eb5b137b5968252873981bd594d3 -->
<!-- monban:ref ../../../../docs/doc.md sha256:b715bc616f5ce9cce34b6dff085eeee5c9da1c77663b5ef7e0207181788d238e -->
<!-- monban:ref ../../../../docs/github.md sha256:b0e3d9b5d1565d470392a98069cb17fc992dc2c37997e67b8fae6f268f95ca7c -->
<!-- monban:ref ../../../../docs/deps.md sha256:72fbd502d2355ff55278e526129b5cc12b9b395d3f56b94357411ea59ae11c35 -->
<!-- monban:ref ../../../../docs/git.md sha256:97fbd12bc0720a8f7a4a862665e168c7a8b36cd9d1ef0519dbca5a3cdb3a4fda -->
<!-- monban:ref ../../../../docs/agent.md sha256:212c0a46b4652f8f907d63fbd2218ed815f2804eec55701ba2da3a4acf68568a -->
<!-- monban:ref ../../../../docs/diff.md sha256:386bc8c7de510389f33fa17ebb214d33e13f25841f137aa2448bcbe3d4bce6df -->
<!-- monban:ref ../../../../docs/extends.md sha256:5e64859a7aba1564afb07e418ef9c592d67b6a7746a233427bebf86a6f91b926 -->

| コマンド | 対象 | docs |
|---|---|---|
| `monban path` | ファイル・ディレクトリの存在、命名、深度、数、ハッシュ、サイズ | [docs/path.md](https://github.com/Mulyu/monban/blob/main/docs/path.md) |
| `monban content` | 正規表現による禁止・必須パターン、BOM、不可視文字、シークレット、injection、マージコンフリクト、行数 | [docs/content.md](https://github.com/Mulyu/monban/blob/main/docs/content.md) |
| `monban doc` | ドキュメントの参照ハッシュ・リンク切れ | [docs/doc.md](https://github.com/Mulyu/monban/blob/main/docs/doc.md) |
| `monban github` | GitHub Actions のピン留め・権限・トリガー、CODEOWNERS | [docs/github.md](https://github.com/Mulyu/monban/blob/main/docs/github.md) |
| `monban deps` | 依存マニフェストの実在・鮮度・人気度・類似性 | [docs/deps.md](https://github.com/Mulyu/monban/blob/main/docs/deps.md) |
| `monban git` | コミットメッセージ・trailer・Issue 参照・変更粒度・ignore すり抜け | [docs/git.md](https://github.com/Mulyu/monban/blob/main/docs/git.md) |
| `monban agent` | AGENTS.md / CLAUDE.md / .mcp.json / AI ignore ファイル | [docs/agent.md](https://github.com/Mulyu/monban/blob/main/docs/agent.md) |

`--diff` は全コマンド共通のスコープフィルタ（[docs/diff.md](https://github.com/Mulyu/monban/blob/main/docs/diff.md)）。組織共通ルールの継承は [docs/extends.md](https://github.com/Mulyu/monban/blob/main/docs/extends.md)。

## 出力の読み方

<!-- monban:ref ../../../../docs/getting-started.md sha256:e4341619dcfe927ace3df740d43d263f787e403ae49707da0753cbda0f3f34df -->

### 終了コード

| コード | 意味 | 対応 |
|---|---|---|
| `0` | pass（`warn` のみも含む） | 続行してよい |
| `1` | `error` 重大度の違反が 1 件以上 | **修正が必要**。違反箇所を読み該当ルールの docs を参照 |
| `2` | 設定エラー・YAML パース失敗・実行時エラー | `monban.yml` を見直す。`MONBAN_DEBUG=1` でスタックトレース |

`warn` 重大度のみは exit 0。「違反がない」のではなく「警告が出ている」点に注意。

### finding フォーマット

```
<SEVERITY>  [<rule>] <path>[:<sub>]
  <message>
```

`[rule]` がどのルール由来かを示す。対応する `docs/<command>.md` の「ルール一覧」を引くと設定の書き方・フィールド表・判定ロジックが載っている。

## 修正ワークフロー

1. `npx @mulyu/monban all` 実行
2. 出力の `[rule]` と `path` を特定
3. 該当コマンドの docs を読み、**ルールの意図**と**設定フィールド**を把握
4. 違反をコードで修正（monban 自体は `--fix` を提供しない）
5. 再実行して 0 になることを確認

### 違反の典型カテゴリ

- **path 違反**: ディレクトリ命名・深度・命名規則。構造を直す／設定を `allowed` に追加
- **content 違反**: 禁止パターン・必須セクション欠落。該当行を修正／セクション追加
- **doc 違反**: 参照先ファイルのハッシュずれ。`monban doc --update` でハッシュ再計算（別コマンド）、または参照先の変更を反映
- **deps 違反**: 存在しない／新規すぎる／類似名パッケージ。人気パッケージへ置換
- **github 違反**: Action の非ピン留め、過剰権限、危険トリガー。SHA ピン・`permissions:` 追加
- **agent 違反**: MCP の secret 直埋め・非ピン npx・ignore 漏れ。`${VAR}` 経由・バージョン固定・`.llmignore` 追記
- **git 違反**: コミットメッセージ品質・変更粒度。再コミット／分割

## monban.yml の基本構造

```yaml
extends:
  - type: local
    path: "./shared/base.yml"

exclude:
  - "**/node_modules/**"
  - "**/dist/**"

path:    { ... }
content: { ... }
doc:     { ... }
github:  { ... }
deps:    { ... }
git:     { ... }
agent:   { ... }
```

### 命名規約（全コマンド共通）

| 語彙 | 意味 |
|---|---|
| `required` | 無ければ違反 |
| `forbidden` | 一致したら違反（denylist 兼用） |
| `allowed` | リスト外は違反（allowlist） |

動詞形（`allow`/`deny`/`forbid`/`require`）や `denied` は使わない。

### セレクタ

- すべて `path`（glob）で統一
- `content` のみ、対象ファイル選択に `path`、テキスト検査に `pattern`

## 初回導入

`monban.yml` が無いプロジェクトでは `/monban:init` スラッシュコマンドで雛形生成できる。

## よくある誤解

- **`--fix` は無い**: 検出のみ。修正はエージェントか人間が行う
- **`--diff` は判定条件ではない**: 対象ファイルのフィルタ。同じルールがフル走査でも差分でも同じ意味を持つ
- **`warn` でも CI は落ちない**: `error` 重大度のみ exit 1。CI で落としたいルールは `severity: error` を明示
- **ネットワーク失敗は `warn` finding として記録**: `monban deps` のレジストリ照合失敗は黙って無視されず、出力に残る。オフラインでは `--offline` で allowed/forbidden のみ動作

## スコープ外

<!-- monban:ref ../../../../docs/concepts.md sha256:5496e2a04eee5b792906a0ed3f5748201a10d334f6e707360317a47b45585614 -->

monban は以下を扱わない（別ツール）。

- 文法・型チェック（tsc, ESLint, Biome）
- フォーマット（Prettier, Biome）
- CVE スキャン（Dependabot, Snyk, OSV-Scanner）
- テスト実行（Vitest, Jest）
- 深いシークレット検出（gitleaks）
- branch protection など GitHub API に依存する設定
