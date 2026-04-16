# 門番 (monban)

> コーディングエージェントのための番所。コードが関所を通過できるか、門番が確かめる。

## 概要

**monban** は、コーディングエージェント（Claude Code、Cursor、Copilot など）が生成・編集したコードを、CIやローカルで静的にチェックするハーネスCLIです。

エージェントはコードを書くのが得意ですが、プロジェクト全体の構造的な一貫性や、ドキュメントとコードの整合性を自律的に保つのは苦手です。monban はその「番人」として機能します。

---

## チェック項目

### 1. アーキテクチャチェック (`monban arch`)

ファイル・ディレクトリの配置が、プロジェクトで定めた構造ルールに従っているかを検証します。

- 特定のディレクトリに置くべきファイルが正しい場所にあるか
- 禁止されたディレクトリ構造が存在していないか
- 必須ファイル（例: `README.md`, `index.ts`）が存在するか

```yaml
# monban.yml の例
arch:
  rules:
    - path: "src/domain/**"
      must_not_contain: "infrastructure"
    - path: "src/handlers/*"
      required_files:
        - "index.ts"
```

### 2. コメントチェック (`monban comment`)

コメントが適切に書かれているかを検証します。

- 関数・クラス・モジュールにコメントが存在するか
- コメント率が設定した閾値を下回っていないか

```yaml
comment:
  min_ratio: 0.05        # コメント行 / 総行数の最低比率
  require_on:
    - exported_functions
    - exported_classes
```

### 3. ファイルサイズチェック (`monban size`)

ファイルの行数が大きくなりすぎていないかを検証します。肥大化したファイルはエージェントのコンテキスト消費を増大させ、可読性を低下させます。

```yaml
size:
  max_lines: 300
  warn_lines: 200
  exclude:
    - "**/*.generated.ts"
    - "**/migrations/**"
```

### 4. ドキュメント整合性チェック (`monban doc`)

ドキュメント（Markdown等）内に記載されたファイルパスと、そのファイルの実際のハッシュが一致するかを検証します。

エージェントがコードを変更したとき、ドキュメントの参照が古くなっていないかを検出します。

```markdown
<!-- monban:file src/handlers/invoice.ts sha256:a3f1c2... -->
```

```yaml
doc:
  targets:
    - "docs/**/*.md"
    - "ARCHITECTURE.md"
```

---

## インストール

```bash
npm install -g monban
# or
npx monban
```

---

## 使い方

```bash
# すべてのチェックを実行
monban check

# チェックを個別に実行
monban arch
monban comment
monban size
monban doc

# ハッシュを最新の状態に更新
monban doc --update

# CI向け（違反があれば exit code 1）
monban check --ci
```

---

## 設定ファイル

プロジェクトルートに `monban.yml` を置きます。

```yaml
# monban.yml
arch:
  rules: []

comment:
  min_ratio: 0.05

size:
  max_lines: 300

doc:
  targets:
    - "**/*.md"
```

---

## コーディングエージェントとの統合

### Claude Code

`CLAUDE.md` に以下を追記することで、エージェントが変更後に自動でチェックを走らせるよう促せます。

```markdown
## 変更後の確認

コードを変更したあとは必ず `npx monban check` を実行し、すべてのチェックがパスすることを確認すること。
```

### GitHub Actions

```yaml
- name: monban check
  run: npx monban check --ci
```

---

## コンセプト

既存のリンター（ESLint、markdownlint など）は言語・フォーマット単体のチェックに特化しています。monban はそれらを補完する「プロジェクト構造レイヤー」のチェックに特化しています。

| ツール | 対象 |
|---|---|
| ESLint / Biome | コードの文法・スタイル |
| markdownlint | Markdownの記述スタイル |
| **monban** | **プロジェクト構造・ドキュメントとコードの整合性** |

特にコーディングエージェントは局所的な変更を大量に行うため、全体の一貫性が崩れやすいという特性があります。monban はその「崩れ」を検出することに集中します。

---

## ライセンス

MIT
