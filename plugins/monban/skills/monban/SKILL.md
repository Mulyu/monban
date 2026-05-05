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

<!-- monban:ref ../../../../docs/path.ja.md sha256:dd00dc5332c5e7f8cb214496506db190c0d2ff18e2df1a551a6bb50de4fc4f23 -->
<!-- monban:ref ../../../../docs/content.ja.md sha256:eede4548c852aa29dcfe4a4e1260b1b0885f3a7a2498a8a10af721422974b2a8 -->
<!-- monban:ref ../../../../docs/doc.ja.md sha256:46fe0a49b9099b122c9362e5dba6ab6d7871280555c02227b4432e6064f343c2 -->
<!-- monban:ref ../../../../docs/github.ja.md sha256:336989e77a02f405345d983840f8b2622416cc1d96f031e399f09ce9ef3ba189 -->
<!-- monban:ref ../../../../docs/deps.ja.md sha256:462c3b2541fc1657babcf1e4740a2b9364032542f0bcbaf6dd5ac4b77fd704f1 -->
<!-- monban:ref ../../../../docs/git.ja.md sha256:ce85bb0be006721b585fac3964e5058bb66bcbbd1379750e40b18c1f514c02eb -->
<!-- monban:ref ../../../../docs/agent.ja.md sha256:777254bca86627fc47d84ccc37039314fd0954a1c1b007b9953b67fa51ba3ac6 -->
<!-- monban:ref ../../../../docs/diff.ja.md sha256:5726e9f22a61138d0af1ea57653fd2d6019f94ab2a2c38c9aec2aeaac2718e9c -->
<!-- monban:ref ../../../../docs/extends.ja.md sha256:83d96111afd903aef0f70b2e1cffc6893340f592166345c4dfed404726327b10 -->

| コマンド | 対象 | docs |
|---|---|---|
| `monban path` | ファイル・ディレクトリの存在、命名、深度、数、ハッシュ、サイズ | [docs/path.ja.md](https://github.com/Mulyu/monban/blob/main/docs/path.ja.md) |
| `monban content` | 正規表現による禁止・必須パターン、BOM、不可視文字、シークレット、injection、マージコンフリクト、行数 | [docs/content.ja.md](https://github.com/Mulyu/monban/blob/main/docs/content.ja.md) |
| `monban doc` | ドキュメントの参照ハッシュ・リンク切れ | [docs/doc.ja.md](https://github.com/Mulyu/monban/blob/main/docs/doc.ja.md) |
| `monban github` | GitHub Actions のピン留め・権限・トリガー、CODEOWNERS | [docs/github.ja.md](https://github.com/Mulyu/monban/blob/main/docs/github.ja.md) |
| `monban deps` | 依存マニフェストの実在・鮮度・人気度・類似性 | [docs/deps.ja.md](https://github.com/Mulyu/monban/blob/main/docs/deps.ja.md) |
| `monban git` | コミットメッセージ・trailer・Issue 参照・変更粒度・ignore すり抜け | [docs/git.ja.md](https://github.com/Mulyu/monban/blob/main/docs/git.ja.md) |
| `monban agent` | AGENTS.md / CLAUDE.md / .mcp.json / AI ignore ファイル | [docs/agent.ja.md](https://github.com/Mulyu/monban/blob/main/docs/agent.ja.md) |

`--diff` は全コマンド共通のスコープフィルタ（[docs/diff.ja.md](https://github.com/Mulyu/monban/blob/main/docs/diff.ja.md)）。組織共通ルールの継承は [docs/extends.ja.md](https://github.com/Mulyu/monban/blob/main/docs/extends.ja.md)。

## 出力の読み方

<!-- monban:ref ../../../../docs/getting-started.ja.md sha256:27d9ba6c9ae868acc465b8c9a9fe5bb90a60a020a3f8e12d16b145e0aa9a20e4 -->

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

<!-- monban:ref ../../../../docs/concepts.ja.md sha256:1e1c17ea27dada9ae06ac5f54695d96d02c05fd077b36bdbacddf1abe96ce845 -->

monban は以下を扱わない（別ツール）。

- 文法・型チェック（tsc, ESLint, Biome）
- フォーマット（Prettier, Biome）
- CVE スキャン（Dependabot, Snyk, OSV-Scanner）
- テスト実行（Vitest, Jest）
- 深いシークレット検出（gitleaks）
- branch protection など GitHub API に依存する設定
