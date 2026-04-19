# monban agent

AI エージェント（Claude / Cursor / Copilot 等）のためのリポジトリ設定ファイル（`AGENTS.md` / `CLAUDE.md` / `.mcp.json` / AI ignore ファイル）の整合性を検証する。

- 2025–2026 年に急増した MCP 関連 CVE（CVE-2025-68143/68144/68145、CVE-2025-53773、CVE-2025-6515 等）への対応
- エージェント向けドキュメントの品質担保（必須セクション、サイズ上限、frontmatter の shape）
- AI ignore ファイルに `.env*` / `*.pem` / `id_rsa` 等の機密が含まれているかの担保

```bash
monban agent                        # 全ルール実行
monban agent --rule mcp             # 特定ルールのみ
monban agent --json                 # JSON 出力
```

---

## ルール一覧

| # | ルール | 対象 | 概要 |
|---|--------|------|------|
| 1 | `instructions` | `AGENTS.md` / `CLAUDE.md` | 存在、必須 H2 セクション、サイズ上限、frontmatter の key allowlist |
| 2 | `mcp` | `.mcp.json` / `.claude/settings.json` / `.cursor/mcp.json` | `mcpServers` の allow/deny、生シェル禁止、`npx @latest` 禁止、env の直値 secret 検出 |
| 3 | `ignore` | `.llmignore` / `.aiexclude` / `.claudeignore` / `.cursorignore` | `.env*` / `*.pem` / `id_rsa` 等の必須カバレッジ |

---

## 設定

```yaml
# monban.yml
agent:
  instructions:
    - path: "AGENTS.md"
      required_sections: [Commands, Testing, Style, Boundaries]
      max_bytes: 12288
      frontmatter_keys: [description, tags]

  mcp:
    - path: "{.mcp.json,.claude/settings.json,.cursor/mcp.json}"
      forbidden_commands: [curl, wget, sh, bash, zsh]
      forbid_unpinned_npx: true
      forbid_env_secrets: true

  ignore:
    - path: ".llmignore"
      must_cover: [".env", ".env.*", "*.pem", "id_rsa", "**/secrets/**"]
```

---

## 1. instructions

エージェント指示書（`AGENTS.md` / `CLAUDE.md`）の構造を検証する。

### 設定

```yaml
agent:
  instructions:
    - path: "AGENTS.md"
      required_sections: [Commands, Testing, Style, Boundaries]
      max_bytes: 12288
      frontmatter_keys: [description, tags]
      severity: warn
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象ファイルの glob |
| `exclude` | string[] | No | `[]` | 除外 glob |
| `required_sections` | string[] | No | — | 必須 H2 見出し（大小無視） |
| `max_bytes` | integer | No | — | サイズ上限（エージェントはこれを超えると読み飛ばすことがある） |
| `frontmatter_keys` | string[] | No | — | `---` frontmatter が存在する場合の許可 key |
| `message` | string | No | — | カスタムメッセージ |
| `severity` | `"error"` \| `"warn"` | No | `"warn"` | 重大度 |

### 判定

1. `path` で指定した glob にマッチするファイルを列挙。マッチが 0 件なら「見つかりません」違反
2. 各ファイルについて:
   - `max_bytes` が指定されていれば、ファイルサイズを検査
   - `required_sections` が指定されていれば、`^## <name>\s*$` 形式の H2 を抽出し、必須リストとの突き合わせ
   - `frontmatter_keys` が指定されていれば、先頭の `---\n...\n---` ブロックを YAML としてパースし、許可リスト外の key を flag

### 出力例

```
WARN  [instructions] AGENTS.md
  必須セクションが見つかりません: ## Boundaries

WARN  [instructions] AGENTS.md
  サイズ 15432 B が上限 12288 B を超えています (大きすぎるとエージェントに無視されます)。
```

---

## 2. mcp

MCP（Model Context Protocol）設定ファイルの構造と安全性を検証する。`.mcp.json` / `.claude/settings.json` / `.cursor/mcp.json` が対象。

### 設定

```yaml
agent:
  mcp:
    - path: "{.mcp.json,.claude/settings.json,.cursor/mcp.json}"
      forbidden_commands: [curl, wget, sh, bash, zsh]
      forbid_unpinned_npx: true
      forbid_env_secrets: true
      allowed_servers: [github, filesystem]
      severity: error
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象ファイルの glob |
| `exclude` | string[] | No | `[]` | 除外 glob |
| `forbidden_commands` | string[] | No | `[curl, wget, sh, bash, zsh]` | 禁止する生シェルコマンド |
| `forbid_unpinned_npx` | boolean | No | `true` | `npx pkg@latest` / 無指定を禁止 |
| `forbid_env_secrets` | boolean | No | `true` | env の直値が secret 形式なら flag（`${VAR}` 展開は OK） |
| `allowed_servers` | string[] | No | — | 指定時、この名前のみ許可 |
| `denied_servers` | string[] | No | `[]` | 明示的に禁止する server 名 |
| `message` | string | No | — | カスタムメッセージ |
| `severity` | `"error"` \| `"warn"` | No | `"warn"` | 重大度 |

### 判定

対象ファイルを JSON としてパースし、`mcpServers` オブジェクトの各 server に対して検査する。

- **forbidden_commands**: `command` フィールドがリストに含まれていれば違反（`"command": "bash"` 等）
- **forbid_unpinned_npx**: `command` が `npx` または `npx.cmd` で、かつ `args` 内のパッケージ名にバージョン指定がない／`@latest` なら違反
- **forbid_env_secrets**: `env` 内の文字列値が `${...}` を含まず、key 名に `token/secret/key/password/api_key/credential` を含み、値が 16 文字以上なら違反
- **allowed_servers / denied_servers**: server 名の allow/deny

### 出力例

```
WARN  [mcp] .mcp.json:dangerous
  生シェル経由の MCP server: command=bash (任意コード実行の経路)

WARN  [mcp] .mcp.json:unpinned
  npx の MCP server がバージョン固定されていません: @modelcontextprotocol/server-foo@latest (供給網侵害時に自動被弾)

WARN  [mcp] .mcp.json:hardcoded-secret.env.GITHUB_TOKEN
  MCP server の env に直値らしきシークレット (GITHUB_TOKEN) を検出。${VAR} 経由で渡してください。
```

### 2025–2026 年の MCP 関連 CVE 背景

`mcp` ルールは、MCP 関連のサプライチェーン攻撃に対応する:

- **CVE-2025-68143 / 68144 / 68145**: Anthropic 公式 Git MCP server の prompt injection
- **CVE-2025-53773**: GitHub Copilot RCE via prompt injection
- **CVE-2025-6515**: MCP prompt hijacking (JFrog 報告)
- **CVE-2025-5277 / 5276 / 5273**: aws-mcp-server command injection / markdownify SSRF

これらの多くは「設定ファイル自体が攻撃面」になっており、`.mcp.json` のコミット時点でリスクを検出できるのが本ルールの狙い。

---

## 3. ignore

AI ignore ファイル（`.llmignore` / `.aiexclude` / `.claudeignore` / `.cursorignore`）が機密ファイルをカバーしているかを検証する。

### 設定

```yaml
agent:
  ignore:
    - path: ".llmignore"
      must_cover:
        - ".env"
        - ".env.*"
        - "*.pem"
        - "id_rsa"
        - "id_rsa.*"
        - "**/secrets/**"
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `path` | string | Yes | — | 対象ファイルの glob |
| `exclude` | string[] | No | `[]` | 除外 glob |
| `must_cover` | string[] | No | 機密ファイル定型 6 種 | 含まれていなければ違反とするパターン |
| `message` | string | No | — | カスタムメッセージ |
| `severity` | `"error"` \| `"warn"` | No | `"warn"` | 重大度 |

### 判定

1. 対象ファイルを行単位で読み込み、`#` 以降のコメントを除去
2. 各行を ignore パターンとして集合化（`!negation` は `!` を除いた形で登録）
3. `must_cover` の各項目が集合に含まれているかを厳密一致で検査

ワイルドカードマッチは行わない。「`.env.local` は `.env.*` にマッチするから OK」のような推論はせず、**`.env.*` を設定ファイル側で明示する** ことを要求する。これは「明示的にカバーする」規律を促すため。

### 出力例

```
WARN  [ignore] .llmignore
  必須カバレッジが欠落: .env.* が ignore リストに含まれていません。

WARN  [ignore] .llmignore
  必須カバレッジが欠落: *.pem が ignore リストに含まれていません。
```

---

## 共通出力

```
$ monban agent

monban agent — エージェントチェック

  ✗ instructions          2 violations (warn)
  ✗ mcp                   3 violations (warn)
  ✗ ignore                2 violations (warn)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  7 violations (7 warnings)
  0/3 rules passed
```

## スコープ外

以下は `monban agent` では検出しない（別ツールの領域）:

- MCP server 自体の悪意検出 → 公開レジストリ / コードレビュー
- `AGENTS.md` の **内容の正しさ**（例: ビルドコマンドが実在するか）→ 別ツール（AgentLinter / cclint 等）
- ignore ファイル間の rule 整合（`.aiexclude` と `.cursorignore` の diff 禁止）→ `.llmignore` 仕様が未確定のため保留
