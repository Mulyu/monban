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
| `monban doc` | ドキュメント整合性 | 参照ハッシュの一致・リンク切れ |
| `monban actions` | GitHub Actions | アクションのピン留め・必須ワークフロー・禁止アクション |

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

### ドキュメントチェック (`monban doc`)

ドキュメントの参照整合性とリンク切れを検証します。

| ルール | 概要 |
|--------|------|
| `ref` | `monban:ref` マーカーで参照したファイルのハッシュ一致を検証する |
| `link` | Markdown 内の相対リンク切れを検出する |

```yaml
doc:
  ref:
    - path: "docs/**/*.md"
  link:
    - path: "docs/**/*.md"
    - path: "*.md"
```

詳細: [docs/doc.md](docs/doc.md)

### GitHub Actions チェック (`monban actions`)

GitHub Actions ワークフローのセキュリティと構成を検証します。

| ルール | 概要 |
|--------|------|
| `pinned` | `uses` のアクション指定がコミットハッシュで固定されているか |
| `required` | 必須ワークフロー・必須ステップの存在を検証する |
| `forbidden` | 禁止アクションの使用を検出する |

```yaml
actions:
  pinned:
    - path: ".github/workflows/**/*.yml"
  required:
    - file: ".github/workflows/test.yml"
    - path: ".github/workflows/test.yml"
      steps: ["actions/checkout", "actions/setup-node"]
  forbidden:
    - path: ".github/workflows/**/*.yml"
      uses: "actions/create-release"
      message: "release-please を使ってください。"
```

詳細: [docs/actions.md](docs/actions.md)

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
monban actions

# 特定ルールのみ実行
monban path --rule forbidden
monban content --rule required
monban actions --rule pinned

# JSON 出力
monban all --json
monban path --json
```

---

## 設定ファイル

プロジェクトルートに `monban.yml` を置きます。

```yaml
# monban.yml
extends:
  - type: local
    path: "./shared/base.yml"
  - type: github
    repo: "myorg/monban-standards"
    ref: "main"
    path: "base.yml"

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
  ref: [...]
  link: [...]

actions:
  pinned: [...]
  required: [...]
  forbidden: [...]
```

### 設定の継承（extends）

`extends` で他の YAML 設定を継承できます。ローカルファイルや GitHub リポジトリから取得可能で、組織共通のベースルールを再利用するのに便利です。

- **local**: ローカルファイルから取得
- **github**: GitHub リポジトリから git clone で取得（プライベートリポジトリも既存の Git 認証で対応）

継承先のルール配列は、現在の設定のルール配列に**連結**されます。

詳細: [docs/extends.md](docs/extends.md)

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
