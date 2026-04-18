# monban git

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

trailer（`Co-authored-by`、`Signed-off-by`、`AI-Assistant` 等）のポリシーを強制する。

trailer の取得は `git interpret-trailers --parse`（Git 標準コマンド）で行う。

**既定方針**: `deny` / `require` / `allow` のいずれも既定では空。利用者が必要に応じて明示的に設定する。AI 属性 trailer（`Co-authored-by: Claude` 等）の扱いは組織ごとに判断が分かれるため、monban の既定設定は何も禁止しない。

### 設定

```yaml
git:
  commit:
    trailers:
      # 特定の trailer を禁止
      deny:
        - key: "Co-authored-by"
          value_pattern: "(Claude|Copilot|Cursor|ChatGPT|Gemini)"
          message: "AI の Co-authored-by は組織ポリシーで禁止されています"
        - key: "Generated-by"

      # 特定の trailer を必須化
      require:
        - key: "Signed-off-by"
          message: "DCO 準拠のため Signed-off-by が必要です"

      # 明示的に許可（deny ルールより優先）
      allow:
        - key: "AI-Assistant"

      severity: error
```

### フィールド

**deny エントリ**

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `key` | string | Yes | trailer キー（大文字小文字を区別しない） |
| `value_pattern` | string | No | value に対する正規表現（部分一致）。省略時はキーの存在だけで違反 |
| `message` | string | No | エラーメッセージ |

**require エントリ**

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `key` | string | Yes | 必須の trailer キー |
| `message` | string | No | エラーメッセージ |

**allow エントリ**

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `key` | string | Yes | 許可する trailer キー |

**共通**

| フィールド | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| `severity` | `"error"` \| `"warn"` | `"error"` | 重大度 |

### 判定

1. `deny` — キーが一致し、`value_pattern` が指定されていれば value に部分一致する場合に違反
2. `require` — 全コミットにキーが存在しない場合に違反
3. `allow` — `deny` に一致していても `allow` にも一致する場合は通過

trailer キーは大文字小文字を区別せず正規化して比較する（`co-authored-by` ≡ `Co-Authored-By`）。

### 出力例

```
ERROR [commit.trailers] d4e5f6g
  trailer "Co-authored-by: Claude <noreply@anthropic.com>" is denied by policy
  AI の Co-authored-by は組織ポリシーで禁止されています
```

---

## 3. commit.references

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
      allow:
        - ".vscode/settings.json"

      message: ".gitignore に一致しますが追跡されています。意図的ですか？"
      severity: warn
```

### フィールド

| フィールド | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| `scope` | `"diff"` \| `"all"` | `"diff"` | `diff`: 差分スコープ内の新規追加ファイルのみ検査。`all`: リポジトリ全体 |
| `allow` | string[] | `[]` | 例外として許可するファイルの glob パターン |
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

## 共通出力

```
$ monban git --diff=main

[commit.message] 2 errors
  a1b2c3d: subject exceeds 72 chars (76)
    "feat(auth): add OAuth2 integration with Google, GitHub, and Microsoft providers"
  d4e5f6g: subject is a forbidden keyword: "fix"

[commit.trailers] 1 error
  d4e5f6g: trailer "Co-authored-by: Claude <noreply@anthropic.com>" is denied by policy

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
