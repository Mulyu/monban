# monban git

> **日本語** | [English](./en/git.md)

Git メタデータと差分の粒度を検査する。コーディングエージェントが引き起こしがちな Git 操作の事故と規約崩れを CI で防ぐ。

- Git 標準コマンド（`git log`、`git diff --numstat`、`git ls-files` 等）のみで動作
- 外部 npm 依存を追加しない（`child_process` と既存の `picomatch` で完結）
- セレクタは `path`（glob パターン）ではなく、コミット範囲・ファイル集合で動作する

```bash
monban git                          # 全サブルール実行
monban git --rule commit.message    # 特定サブルールのみ
monban git --rule diff.ignored
monban git --diff=main              # diff スコープ指定（詳細: ./diff.md）
monban git --diff=origin/main...HEAD
monban git --json                   # JSON 出力
```

---

## ルール一覧

| # | ルール | 概要 |
|---|--------|------|
| 1 | `commit.message` | コミットメッセージの形式・長さ・禁止語を検査する |
| 2 | `commit.trailers` | trailer（`Co-authored-by` 等）の禁止・必須・許可ポリシーを強制する |
| 3 | `commit.references` | Issue / チケット番号の参照を必須化する |
| 4 | `diff.size` | PR 変更粒度の上限（ファイル数・行数）を検査する |
| 5 | `diff.ignored` | `.gitignore` 対象なのに追跡されているファイルを検出する |
| 6 | `branch_name` | 現在のブランチ名が規約 regex を満たすか検査する |
| 7 | `tag_name` | リポジトリのタグ名が規約 regex（SemVer 等）を満たすか検査する |

---

## スコープ判定

`monban git` は以下の優先順でコミット範囲を決定する。既存の `--diff` フラグと同じ優先順位。

| 優先度 | 条件 | ベース |
|---|---|---|
| 1 | `--diff=<ref>` 明示指定 | `<ref>...HEAD` 範囲 |
| 2 | CI 環境 (`GITHUB_ACTIONS` 等) | `GITHUB_HEAD_REF` / `GITHUB_BASE_REF` から解決 |
| 3 | feature branch 上 | `git merge-base main HEAD` との diff |
| 4 | それ以外 | 直近コミット / staged 変更 |

### CI 上の detached HEAD 対策

GitHub Actions の PR イベントは detached HEAD になるため、以下の順に参照してベースを解決する:

1. `GITHUB_HEAD_REF` / `GITHUB_BASE_REF`
2. `GITHUB_REF_NAME`
3. `git rev-parse --abbrev-ref HEAD`（フォールバック）

### shallow clone に関する注意

`actions/checkout@v4` はデフォルト `fetch-depth: 1` のため、履歴が取れず検査範囲が不正確になる場合がある。以下を推奨する。

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
```

---

## 設定

```yaml
# monban.yml
git:
  commit:
    message:
      preset: conventional
      subject_max_length: 72
      forbidden_subjects: ["fix", "update", "wip"]
      ignore_merges: true
      severity: error

    trailers:
      deny:
        - key: "Co-authored-by"
          value_pattern: "(Claude|Copilot|Cursor)"
      severity: error

    references:
      required: true
      patterns: ["#\\d+", "PROJ-\\d+"]
      scope: any
      ignore_patterns: ["^chore\\(deps\\):"]
      severity: error

  diff:
    size:
      max_files: 30
      max_total_lines: 1500
      exclude:
        - "**/*.lock"
        - "**/__snapshots__/**"
      severity: warn

    ignored:
      scope: diff
      severity: warn
```

---

## 1. commit.message

<!-- monban:ref ../src/rules/git/commit-message.ts sha256:04015849c7ad913c088716b72b94b2ae4ed87a9c94592e60f6b3dde7f109b178 -->

コミットメッセージの形式・長さ・禁止語を検査する。

対象コミットは `git log --no-merges --format='%H%x00%B%x00' <base>..<head>` で取得する。

### 設定

```yaml
git:
  commit:
    message:
      # プリセット（conventional のみ初期提供）
      preset: conventional

      # プリセットを使わず正規表現で指定する場合
      pattern: "^(feat|fix|chore|docs|refactor|test|perf)(\\(.+\\))?!?: .+"

      # subject の長さ制限（code point 単位）
      subject_max_length: 72
      subject_min_length: 10

      # body の最小長（0 の場合 body なしを許容）
      body_min_length: 0

      # subject 全体がこれと一致する場合にエラー
      forbidden_subjects:
        - "fix"
        - "update"
        - "wip"
        - "misc"
        - "changes"

      ignore_merges: true
      ignore_reverts: true

      severity: error
```

### フィールド

| フィールド | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| `preset` | `"conventional"` | — | プリセット。指定時は `pattern` に上書きされる |
| `pattern` | string | — | subject を検査する正規表現 |
| `subject_max_length` | number | `72` | subject の最大文字数（code point 単位） |
| `subject_min_length` | number | `1` | subject の最小文字数 |
| `body_min_length` | number | `0` | body の最小文字数（0 で body なし許容） |
| `forbidden_subjects` | string[] | `[]` | 完全一致で禁止する subject 文字列 |
| `ignore_merges` | boolean | `true` | merge コミットを検査しない |
| `ignore_reverts` | boolean | `true` | revert コミットを検査しない |
| `severity` | `"error"` \| `"warn"` | `"error"` | 重大度 |

### プリセット

| 名前 | 正規表現 |
|------|---------|
| `conventional` | `^(feat\|fix\|chore\|docs\|refactor\|test\|perf\|ci\|build\|style)(\(.+\))?!?: .+` |

### 出力例

```
ERROR [commit.message] a1b2c3d
  subject exceeds 72 chars (76):
  "feat(auth): add OAuth2 integration with Google, GitHub, and Microsoft providers"

ERROR [commit.message] d4e5f6g
  subject is a forbidden keyword: "fix"
```

---

## 2. commit.trailers

<!-- monban:ref ../src/rules/git/commit-trailers.ts sha256:e6d00b467a4d811470b9bb7641a5929ce16d23b7ea84de51f18bcdf519f6f7f9 -->

trailer（`Co-authored-by`、`Signed-off-by`、`AI-Assistant` 等）のポリシーを強制する。

trailer の取得は `git interpret-trailers --parse`（Git 標準コマンド）で行う。

**既定方針**: `forbidden` / `required` / `allowed` のいずれも既定では空。利用者が必要に応じて明示的に設定する。AI 属性 trailer（`Co-authored-by: Claude` 等）の扱いは組織ごとに判断が分かれるため、monban の既定設定は何も禁止しない。

### 設定

```yaml
git:
  commit:
    trailers:
      # 特定の trailer を禁止
      forbidden:
        - key: "Co-authored-by"
          value_pattern: "(Claude|Copilot|Cursor|ChatGPT|Gemini)"
          message: "AI の Co-authored-by は組織ポリシーで禁止されています"
        - key: "Generated-by"

      # 特定の trailer を必須化
      required:
        - key: "Signed-off-by"
          message: "DCO 準拠のため Signed-off-by が必要です"

      # 明示的に許可（forbidden ルールより優先）
      allowed:
        - key: "AI-Assistant"

      severity: error
```

### フィールド

**forbidden エントリ**

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `key` | string | Yes | trailer キー（大文字小文字を区別しない） |
| `value_pattern` | string | No | value に対する正規表現(部分一致)。省略時はキーの存在だけで違反 |
| `message` | string | No | エラーメッセージ |

**required エントリ**

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `key` | string | Yes | 必須の trailer キー |
| `message` | string | No | エラーメッセージ |

**allowed エントリ**

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `key` | string | Yes | 許可する trailer キー |

**共通**

| フィールド | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| `severity` | `"error"` \| `"warn"` | `"error"` | 重大度 |

### 判定

1. `forbidden` — キーが一致し、`value_pattern` が指定されていれば value に部分一致する場合に違反
2. `required` — 全コミットにキーが存在しない場合に違反
3. `allowed` — `forbidden` に一致していても `allowed` にも一致する場合は通過

trailer キーは大文字小文字を区別せず正規化して比較する（`co-authored-by` ≡ `Co-Authored-By`）。

### 出力例

```
ERROR [commit.trailers] d4e5f6g
  trailer "Co-authored-by: Claude <noreply@anthropic.com>" is forbidden by policy
  AI の Co-authored-by は組織ポリシーで禁止されています
```

---

## 3. commit.references

<!-- monban:ref ../src/rules/git/commit-references.ts sha256:e6199d3565daf0295c41dc0923ec1a8ef18fc16fb9558c5b8d60626ddb01e21b -->

Issue / チケット番号の参照を必須化する。`commit.message` と同じくコミット本文を取得し、正規表現で検査する。

### 設定

```yaml
git:
  commit:
    references:
      required: true

      # 複数パターンの OR 条件
      patterns:
        - "#\\d+"        # GitHub Issue
        - "PROJ-\\d+"   # Jira
        - "GH-\\d+"

      # all: 全コミットに必須 / any: range 内に最低 1 つあれば OK
      scope: any

      # 除外: 依存更新や revert は対象外
      ignore_patterns:
        - "^chore\\(deps\\):"
        - "^Revert "
      ignore_merges: true

      severity: error
```

### フィールド

| フィールド | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| `required` | boolean | `false` | このルールを有効にするか |
| `patterns` | string[] | — | 参照として認識する正規表現のリスト（OR 条件） |
| `scope` | `"all"` \| `"any"` | `"any"` | `all`: 全コミットに必須。`any`: range 内に最低 1 つあれば OK |
| `ignore_patterns` | string[] | `[]` | subject がこれにマッチするコミットを除外 |
| `ignore_merges` | boolean | `true` | merge コミットを除外 |
| `severity` | `"error"` \| `"warn"` | `"error"` | 重大度 |

参照が「実在する Issue か」は検査しない（GitHub API を叩かない）。

### 出力例

```
ERROR [commit.references]
  no commit in range contains a reference matching ["#\d+", "PROJ-\d+"]
```

---

## 4. diff.size

<!-- monban:ref ../src/rules/git/diff-size.ts sha256:7a73f9d93ce34f67c87ae2da6a52599e07cb067c157d32618c64c0e02de45b1d -->

PR の変更粒度が大きすぎないかを検査する。`git diff --numstat <base>...<head>` でファイル単位の増減行数を取得する。

### 設定

```yaml
git:
  diff:
    size:
      max_files: 30
      max_insertions: 1000
      max_deletions: 500
      max_total_lines: 1500    # insertions + deletions

      # 除外: lockfile や自動生成ファイルは計算から外す
      exclude:
        - "**/*.lock"
        - "package-lock.json"
        - "yarn.lock"
        - "pnpm-lock.yaml"
        - "go.sum"
        - "**/testdata/**"
        - "**/__snapshots__/**"

      severity: warn
```

### フィールド

| フィールド | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| `max_files` | number | — | 変更ファイル数の上限 |
| `max_insertions` | number | — | 挿入行数の上限 |
| `max_deletions` | number | — | 削除行数の上限 |
| `max_total_lines` | number | `1500` | 挿入 + 削除の合計行数の上限 |
| `exclude` | string[] | `[]` | 計算から除外するファイルの glob パターン |
| `severity` | `"error"` \| `"warn"` | `"warn"` | 重大度（既定は warn） |

バイナリファイル（`git diff --numstat` で `-` と表示されるもの）は行数カウントから除外する。

### 出力例

```
WARN [diff.size]
  total insertions 1824 exceeds max 1000
  total lines (insertions + deletions) 2104 exceeds max 1500
```

---

## 5. diff.ignored

<!-- monban:ref ../src/rules/git/diff-ignored.ts sha256:cf48531035af87c0e88150c83a308e916df29e87d087c5f4a92c18379de8593e -->

`.gitignore` にパターンが書かれているのに追跡されているファイルを検出する。エージェントが `git add -f` や `git add -A` で意図せず追加する事故への対策。

取得は `git ls-files --cached --ignored --exclude-standard` で行う（Git 標準機能、shallow clone でも動作する）。

### 設定

```yaml
git:
  diff:
    ignored:
      # diff: 差分スコープ内の新規追加ファイルのみ（既定）
      # all: リポジトリ全体を対象
      scope: diff

      # 意図的に追跡している ignore ファイルの例外
      allowed:
        - ".vscode/settings.json"

      message: ".gitignore に一致しますが追跡されています。意図的ですか？"
      severity: warn
```

### フィールド

| フィールド | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| `scope` | `"diff"` \| `"all"` | `"diff"` | `diff`: 差分スコープ内の新規追加ファイルのみ検査。`all`: リポジトリ全体 |
| `allowed` | string[] | `[]` | 例外として許可するファイルの glob パターン |
| `message` | string | — | 出力メッセージ |
| `severity` | `"error"` \| `"warn"` | `"warn"` | 重大度 |

`scope: diff` が既定なのは、既存リポジトリに初回導入した際に大量の既存違反が検出されることを避けるため。

### 出力例

```
WARN [diff.ignored]
  .env.local: matches .gitignore but is tracked
  .vscode/launch.json: matches .gitignore but is tracked
```

---

## 6. branch_name

<!-- monban:ref ../src/rules/git/branch-name.ts sha256:3a622647a3eb08095a1dd5ab595c4886422488420bcad99d93ed17f6fbdb8e1d -->

現在チェックアウトされているブランチ名が regex に一致するかを検査する。エージェントが作る一時ブランチ命名（例 `claude/foo-bar-XYZ`）を組織規約に揃える用途。

`detached HEAD`（CI の PR イベント等）では何も検査しない。

### 設定

```yaml
git:
  branch_name:
    pattern: "^(feat|fix|chore|docs|claude)/[a-z0-9-]+$"
    allowed: ["main", "develop", "release"]
    forbidden: ["^wip(/|$)", "^tmp(/|$)"]
    severity: warn
    message: "ブランチ名は <type>/<kebab-case> 形式にしてください。"
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| `pattern` | string | No* | — | 一致を要求する正規表現（allowlist 的） |
| `allowed` | string[] | No | `[]` | 検査をスキップする許可名（`main` 等、完全一致） |
| `forbidden` | string[] | No* | `[]` | 一致したら違反になる正規表現のリスト |
| `message` | string | No | — | カスタムメッセージ |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |

\* `pattern` / `forbidden` のいずれか 1 つ以上が必須。`allowed` 該当 → `forbidden` 評価 → `pattern` 評価 の順。

### 出力例

```
ERROR [branch_name] WIP_branch
  branch "WIP_branch" does not match pattern ^(feat|fix|chore)/[a-z0-9-]+$
```

---

## 7. tag_name

<!-- monban:ref ../src/rules/git/tag-name.ts sha256:d9a0a2d9f4105c2d369d0b78b97e47e6bf678acd14c3c5c1cc72b787a34f44a2 -->

リポジトリ内のタグ名が regex に一致するかを検査する。SemVer の徹底や、`v` 接頭辞ポリシーの担保に使う。

タグが 1 つもないリポジトリでは何も報告しない（リリース前のプロジェクト想定）。

### 設定

```yaml
git:
  tag_name:
    pattern: "^v\\d+\\.\\d+\\.\\d+(-[a-z0-9.]+)?$"
    # 既存の非準拠タグを個別免除
    allowed: ["release-1", "legacy-v2"]
    # beta/rc をタグとして禁止する例
    forbidden: ["(beta|rc)\\d*$"]
    scope: recent      # all | recent
    limit: 50
    severity: error
    message: "SemVer 形式のタグを使ってください (例: v1.2.3, v1.2.3-rc.1)。"
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| `pattern` | string | No* | — | 一致を要求する正規表現（allowlist 的） |
| `allowed` | string[] | No | `[]` | 検査をスキップする許可タグ名（完全一致） |
| `forbidden` | string[] | No* | `[]` | 一致したら違反になる正規表現のリスト |
| `scope` | `"all"` \| `"recent"` | No | `"all"` | `recent` は creatordate の新しい順で `limit` 件のみ検査 |
| `limit` | integer | No | `100` | `scope: recent` のときの検査タグ数 |
| `message` | string | No | — | カスタムメッセージ |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |

\* `pattern` / `forbidden` のいずれか 1 つ以上が必須。`allowed` 該当 → `forbidden` 評価 → `pattern` 評価 の順。

### 出力例

```
ERROR [tag_name] release-2
  tag "release-2" does not match pattern ^v\d+\.\d+\.\d+$
```

### 既存タグの取り扱い

SemVer 規約導入時、過去の非準拠タグは `scope: recent` で対象から除外して段階的に整備する想定。`scope: all` は新規プロジェクトや、既に整備済みのリポジトリで使う。

---

## 共通出力

```
$ monban git --diff=main

[commit.message] 2 errors
  a1b2c3d: subject exceeds 72 chars (76)
    "feat(auth): add OAuth2 integration with Google, GitHub, and Microsoft providers"
  d4e5f6g: subject is a forbidden keyword: "fix"

[commit.trailers] 1 error
  d4e5f6g: trailer "Co-authored-by: Claude <noreply@anthropic.com>" is forbidden by policy

[diff.size] 1 warning
  total insertions 1824 exceeds max 1000

[diff.ignored] 1 warning
  .env.local: matches .gitignore but is tracked

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  3 errors, 2 warnings. Blocking merge.
```

---

## 既存ツールとの棲み分け

| ツール | 対象 |
|--------|------|
| commitlint / gitlint | コミットメッセージに特化。Node / Python ランタイム必須 |
| pre-commit フレームワーク | 汎用フック。各フックが個別ランタイムを持ち込む場合が多い |
| check-added-large-files | ファイルサイズ専用 |
| gitleaks | シークレット検出に特化 |
| **monban git** | **エージェント特有の問題（メッセージ品質・巨大 PR・ignore すり抜け）を言語非依存・単一設定で検査** |

monban は完全代替を目指さず、上記ツールとの組み合わせで使うことを想定している。
