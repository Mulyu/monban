# 門番 (monban)

> コーディングエージェントのための番所。コードが関所を通過できるか、門番が確かめる。

## 概要

**monban** は、コーディングエージェント（Claude Code、Cursor、Copilot など）が生成・編集したコードを、CIやローカルで静的にチェックするハーネスCLIです。

エージェントはコードを書くのが得意ですが、プロジェクト全体の構造的な一貫性や、ドキュメントとコードの整合性を自律的に保つのは苦手です。monban はその「番人」として機能します。

言語非依存・AST 不要。どの言語のプロジェクトでも動作します。

---

## チェック項目

| コマンド | 対象 | 概要 |
|---------|------|------|
| `monban path` | パス構造 | ファイル・ディレクトリの存在、命名、深度、数 |
| `monban content` | ファイル内容 | 正規表現による禁止・必須パターン |
| `monban doc` | ドキュメント整合性 | コードとドキュメントのハッシュ一致 |

---

### パスチェック (`monban path`)

ファイル・ディレクトリの配置が、プロジェクトで定めた構造ルールに従っているかを検証します。

| ルール | 概要 |
|--------|------|
| `forbidden` | 存在してはならないパスを検出する |
| `required` | 存在しなければならないファイルの欠落を検出する |
| `naming` | ファイル・ディレクトリの命名規則違反を検出する |
| `depth` | ディレクトリのネスト深度の超過を検出する |
| `count` | ディレクトリ内のファイル数の超過を検出する |

```yaml
path:
  forbidden:
    - path: "**/utils/**"
      message: "utils/ は使用禁止。適切なモジュールに配置してください。"
    - path: "src/**/*.js"
      message: "src/ 内に .js は配置できません。"

  required:
    - path: "src/handlers/*"
      files: ["index.ts", "schema.ts"]
    - path: "src/components/**/*.tsx"
      exclude: ["**/*.test.tsx"]
      companions: ["{stem}.test.tsx"]

  naming:
    - path: "src/components/**/*.tsx"
      style: pascal
    - path: "src/**/"
      target: directory
      style: kebab

  depth:
    - path: "src"
      max: 4

  count:
    - path: "src/handlers"
      max: 20
```

詳細: [docs/path.md](docs/path.md)

### コンテンツチェック (`monban content`)

ファイル内容に対して正規表現マッチを行い、禁止パターン・必須パターンを検証します。

| ルール | 概要 |
|--------|------|
| `forbidden` | ファイル内の禁止テキストパターンを検出する |
| `required` | ファイル内の必須テキストパターンの欠落を検出する |

```yaml
content:
  forbidden:
    - path: "src/domain/**"
      pattern: "process\\.env"
      message: "domain 層で環境変数に直接アクセスしないでください。"

  required:
    - path: "src/**/*.ts"
      pattern: "^// Copyright \\d{4}"
      scope: first_line
      message: "すべてのファイルにコピーライトヘッダーが必要です。"
```

詳細: [docs/content.md](docs/content.md)

### ドキュメント整合性チェック (`monban doc`)

ドキュメント内に記載されたファイルパスと、そのファイルの実際のハッシュが一致するかを検証します。

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
monban all

# チェックを個別に実行
monban path
monban content
monban doc

# 特定ルールのみ実行
monban path --rule forbidden
monban content --rule required

# ハッシュを最新の状態に更新
monban doc --update

# JSON 出力
monban all --json
monban path --json
```

---

## 設定ファイル

プロジェクトルートに `monban.yml` を置きます。

```yaml
# monban.yml
exclude:
  - "**/node_modules/**"
  - "**/vendor/**"
  - "**/dist/**"

path:
  forbidden: [...]
  required: [...]
  naming: [...]
  depth: [...]
  count: [...]

content:
  forbidden: [...]
  required: [...]

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

コードを変更したあとは必ず `npx monban all` を実行し、すべてのチェックがパスすることを確認すること。
```

### GitHub Actions

```yaml
- name: monban
  run: npx monban all
```

---

## コンセプト

既存のリンター（ESLint、markdownlint など）は言語・フォーマット単体のチェックに特化しています。monban はそれらを補完する「プロジェクト構造レイヤー」のチェックに特化しています。

| ツール | 対象 |
|---|---|
| ESLint / Biome | コードの文法・スタイル |
| markdownlint | Markdownの記述スタイル |
| **monban** | **プロジェクト構造・ファイル内容・ドキュメント整合性** |

特にコーディングエージェントは局所的な変更を大量に行うため、全体の一貫性が崩れやすいという特性があります。monban はその「崩れ」を検出することに集中します。

---

## ライセンス

MIT
