# monban doc

> **日本語** | [English](./doc.md)

ドキュメントの整合性チェック。参照ハッシュの一致とリンク切れを検証する。

- ファイルシステムスキャンのみで完結（git 不要）
- セレクタは `path`（glob パターン）で対象 Markdown ファイルを指定

```bash
monban doc                     # 全ルール実行
monban doc --rule ref          # 特定ルールのみ
monban doc --diff=main         # 差分スコープのみ（詳細: ./diff.md）
monban doc --json              # JSON 出力
```

---

## ルール一覧

| # | ルール | 概要 |
|---|--------|------|
| 1 | `ref` | `monban:ref` マーカーで参照したファイルのハッシュ一致を検証する |
| 2 | `link` | Markdown 内の相対リンク切れを検出する |

---

## 設定

```yaml
# monban.yml
doc:
  ref:
    - path: "docs/**/*.md"
    - path: "*.md"

  link:
    - path: "docs/**/*.md"
    - path: "*.md"
```

---

## 1. ref

<!-- monban:ref ../src/rules/doc/ref.ts sha256:f1ed5c220f6109c37aaf4a79ff87a7f947901fb23f3644bb4dbaf9b5496c2589 -->

ドキュメント内の `monban:ref` マーカーで参照されたファイルのハッシュが実際のファイルと一致するかを検証する。

コードが変更されたのにドキュメントが更新されていない状態を検出する。

### マーカー形式

```markdown
<!-- monban:ref src/auth.ts sha256:a3f1c2... -->
```

### 設定

```yaml
doc:
  ref:
    - path: "docs/**/*.md"
    - path: "ARCHITECTURE.md"
```

### フィールド

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `path` | string | Yes | 対象 Markdown ファイルの glob パターン |

### 判定

1. 対象ファイル内の `<!-- monban:ref <filepath> <algo>:<hash> -->` マーカーを抽出
2. 参照先ファイルを読み込み、指定アルゴリズムでハッシュを計算
3. マーカーのハッシュと一致しなければ違反
4. 参照先ファイルが存在しなければ違反

### 出力例

```
ERROR [ref] docs/architecture.md:15
  ハッシュ不一致: src/auth.ts (expected: a3f1c2... actual: 7b2e9d...)

ERROR [ref] docs/api.md:8
  参照先ファイルが見つかりません: src/old-handler.ts
```

---

## 2. link

<!-- monban:ref ../src/rules/doc/link.ts sha256:9f4442bb0bb2df56d102ad59e5d061217aa93f2780676f557426387c1dd9e401 -->

Markdown 内の相対リンクが実在するファイルを指しているかを検証する。

コーディングエージェントがファイルをリネーム・削除した際、ドキュメント内のリンクが古いまま残るケースを検出する。

### 設定

```yaml
doc:
  link:
    - path: "docs/**/*.md"
    - path: "*.md"
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象 Markdown ファイルの glob パターン |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |

### 判定

1. 対象ファイル内の Markdown リンクを抽出
2. 外部 URL（`http://`、`https://`、`mailto:`）はスキップ
3. アンカーのみ（`#section`）はスキップ
4. アンカー付きリンク（`./file.md#section`）はアンカーを除去してファイル存在を確認
5. リンク先ファイルが存在しなければ違反

### 出力例

```
ERROR [link] docs/guide.md:42
  リンク切れ: ./old-page.md

ERROR [link] README.md:15
  リンク切れ: docs/removed-section.md#overview
```

---

## 共通出力

```
$ monban doc

monban doc — ドキュメントチェック

  ✓ ref
  ✗ link         2 violations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  2 violations (2 errors)
  1/2 rules passed
```
