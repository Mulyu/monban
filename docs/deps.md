# monban deps

依存パッケージのチェック。マニフェストから依存名を抽出し、パッケージレジストリで実在・鮮度・人気度・類似性を検証する。

- 言語非依存・AST 不要
- マニフェスト（`package.json` / `requirements.txt` / `go.mod` / `Gemfile` / `Cargo.toml` / `.github/workflows/*.yml` など）の構造パース + 外部レジストリ API 照合で完結
- セレクタは `path`（glob パターン）。エコシステムはファイル名から自動判定する
- [ecosyste.ms](https://ecosyste.ms/) の packages names API を介し、単一エンドポイントで複数レジストリを扱う

```bash
monban deps                    # 全ルール実行
monban deps --rule existence   # 特定ルールのみ
monban deps --offline          # 外部 API を叩かず allowed / denied のみ実行
monban deps --json             # JSON 出力
```

> `monban deps` は monban で唯一、外部ネットワークに出るコマンドである。エアギャップ環境では `--offline` を指定する。

---

## ルール一覧

| # | ルール | 概要 |
|---|--------|------|
| 1 | `existence` | レジストリに存在しない依存名を検出する（hallucination / slopsquat 対策） |
| 2 | `freshness` | 公開から閾値以内の新規パッケージを検出する |
| 3 | `popularity` | 週間ダウンロード数が閾値未満のパッケージを検出する |
| 4 | `cross_ecosystem` | 別エコシステムにしか存在しない名前の要求を検出する |
| 5 | `typosquat` | 人気パッケージと編集距離が近い類似名を検出する |
| 6 | `allowed` | allowlist（指定名のみ許可） |
| 7 | `denied` | denylist（指定名を禁止） |

---

## 対応マニフェスト

| エコシステム | ファイル | 抽出対象 |
|---|---|---|
| npm | `package.json` | `dependencies` / `devDependencies` / `peerDependencies` / `optionalDependencies` のキー |
| PyPI | `requirements.txt` / `pyproject.toml` | requirements の行頭トークン / `[project.dependencies]` / `[tool.poetry.dependencies]` |
| Go modules | `go.mod` | `require` ブロックのモジュールパス |
| RubyGems | `Gemfile` | `gem "NAME"` / `gem 'NAME'` |
| Cargo | `Cargo.toml` | `[dependencies]` / `[dev-dependencies]` / `[build-dependencies]` のキー |
| GitHub Actions | `.github/workflows/**/*.yml` | step の `uses:` から `@` より前の部分（ローカル参照 `./` は除外） |

lockfile の解析は行わない（Dependabot / Renovate の領域）。monban は **人間 / エージェントが明示的に書いた依存名** に責任を持つ。

---

## 設定

すべてのルールは、トップレベルの `exclude` で指定されたパターンを自動的に除外する。

```yaml
# monban.yml
exclude:
  - "**/node_modules/**"
  - "**/vendor/**"

deps:
  existence:
    - path: "package.json"
    - path: "pyproject.toml"
    - path: ".github/workflows/**/*.yml"

  freshness:
    - path: "package.json"
      max_age_hours: 24
      severity: warn

  popularity:
    - path: "package.json"
      min_downloads: 100
      severity: warn

  cross_ecosystem:
    - path: "package.json"
      severity: warn

  typosquat:
    - path: "package.json"
      max_distance: 2
      severity: warn

  allowed:
    - path: "package.json"
      names:
        - "@myorg/*"
        - my-internal-package

  denied:
    - path: "package.json"
      names:
        - event-stream
        - flatmap-stream
      message: "過去に compromise されたパッケージです。"
```

---

## 1. existence

依存名がレジストリに存在するかを検証する。monban deps の中核ルール。

AI エージェントは自信を持って存在しない依存名を提案する（研究では LLM 生成コードの 5〜21% に存在しないパッケージが含まれるとの報告あり）。これは単なる誤りではなく **slopsquatting** という新しい攻撃ベクトルの入口になる。

### 設定

```yaml
deps:
  existence:
    - path: "package.json"
    - path: "requirements.txt"
    - path: ".github/workflows/**/*.yml"
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| `path` | string | Yes | — | 対象マニフェストの glob |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |
| `exclude` | string[] | No | — | 検査除外するパッケージ名（private registry 経由の内部パッケージなど） |

### 判定

1. マニフェストを構造パースし、依存名を抽出
2. ファイル種別からエコシステムを決定
3. ecosyste.ms の packages names API でパッケージを引き、該当がなければ違反
4. ネットワーク到達不可時はキャッシュがあればキャッシュを、なければ `--offline` 指定時と同様にスキップし warning を出力

### 出力例

```
ERROR [existence] package.json:3 ai-json-helper
  npm レジストリに存在しません。
  hallucination の疑いがあります。
ERROR [existence] package.json:4 reqeusts
  npm レジストリに存在しません。
  PyPI には同名の近接パッケージがあります（requests）。
```

---

## 2. freshness

公開から一定時間内の新規パッケージを警告する。新規パッケージは slopsquat のターゲットになりやすい。

### 設定

```yaml
deps:
  freshness:
    - path: "package.json"
      max_age_hours: 24
      severity: warn
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| `path` | string | Yes | — | 対象マニフェストの glob |
| `max_age_hours` | number | No | `24` | これ未満の経過時間を違反とする |
| `severity` | `"error"` \| `"warn"` | No | `"warn"` | 重大度 |

### 出力例

```
WARN  [freshness] package.json:5 brand-new-logger
  公開から 3 時間（閾値 24h 未満）。
```

---

## 3. popularity

週間ダウンロード数が閾値未満のパッケージを警告する。

### 設定

```yaml
deps:
  popularity:
    - path: "package.json"
      min_downloads: 100
      severity: warn
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| `path` | string | Yes | — | 対象マニフェストの glob |
| `min_downloads` | number | No | `100` | これ未満の週間ダウンロード数を違反とする |
| `severity` | `"error"` \| `"warn"` | No | `"warn"` | 重大度 |

### 出力例

```
WARN  [popularity] package.json:5 brand-new-logger
  週間ダウンロード数 2（閾値 100 未満）。
```

---

## 4. cross_ecosystem

npm プロジェクトなのに PyPI にしか存在しない名前を要求している、といったケースを検出する。AI エージェントが言語を取り違えた痕跡として典型的。

### 設定

```yaml
deps:
  cross_ecosystem:
    - path: "package.json"
      severity: warn
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| `path` | string | Yes | — | 対象マニフェストの glob |
| `severity` | `"error"` \| `"warn"` | No | `"warn"` | 重大度 |

### 出力例

```
WARN  [cross_ecosystem] package.json:4 requests
  npm レジストリに存在しませんが、PyPI に同名パッケージがあります。
  エコシステムの取り違えの疑いがあります。
```

---

## 5. typosquat

人気パッケージと編集距離（Levenshtein）が近い依存名を警告する。

### 設定

```yaml
deps:
  typosquat:
    - path: "package.json"
      max_distance: 2
      severity: warn
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| `path` | string | Yes | — | 対象マニフェストの glob |
| `max_distance` | number | No | `2` | 人気パッケージ名との編集距離がこれ以下で違反 |
| `severity` | `"error"` \| `"warn"` | No | `"warn"` | 重大度 |

### 出力例

```
WARN  [typosquat] package.json:7 lodahs
  人気パッケージ lodash と編集距離 2。
```

---

## 6. allowed

allowlist。指定した名前のみ許可し、それ以外をすべて違反とする。組織の承認済みリスト運用に用いる。

### 設定

```yaml
deps:
  allowed:
    - path: "package.json"
      names:
        - "@myorg/*"       # glob 可
        - express
        - react
        - react-dom
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| `path` | string | Yes | — | 対象マニフェストの glob |
| `names` | string[] | Yes | — | 許可するパッケージ名（glob 可） |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |

### 出力例

```
ERROR [allowed] package.json:6 some-random-lib
  allowlist に含まれていません。
```

---

## 7. denied

denylist。指定した名前を禁止する。過去に compromise されたパッケージや、内部的に置き換え済みのパッケージに使う。

### 設定

```yaml
deps:
  denied:
    - path: "package.json"
      names:
        - event-stream
        - flatmap-stream
      message: "過去に compromise されたパッケージです。"
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| `path` | string | Yes | — | 対象マニフェストの glob |
| `names` | string[] | Yes | — | 禁止するパッケージ名（glob 可） |
| `message` | string | No | — | エラーメッセージ |
| `severity` | `"error"` \| `"warn"` | No | `"error"` | 重大度 |

### 出力例

```
ERROR [denied] package.json:9 event-stream
  過去に compromise されたパッケージです。
```

---

## オフラインモード

`--offline` を指定した場合、ネットワーク通信を要するルール（`existence` / `freshness` / `popularity` / `cross_ecosystem` / `typosquat`）はスキップされ、`allowed` / `denied` のみ実行される。エアギャップ環境や、外部 API への依存を避けたい CI 設定で使う。

```bash
monban deps --offline
```

---

## スコープ外

以下は `monban deps` で扱わない。別ツールに任せる。

| 項目 | 担当ツール |
|---|---|
| CVE スキャン | Snyk / OSV-Scanner |
| インストールスクリプト挙動解析 | Socket |
| ライセンスコンプライアンス | cargo-deny / licensee |
| lockfile の完全依存解決 | Dependabot / Renovate |

monban は **依存名が存在するか／意図通りか** の入口チェックに集中する。

---

## 差分モードとの組み合わせ

`--diff` と組み合わせると、変更されたマニフェストに追加された依存だけを検査する。PR レビューで最も有用な使い方。詳細は [diff.md](diff.md) を参照。

```bash
monban deps --diff=main
```

---

## 共通出力

```
$ monban deps

monban deps — 依存チェック

  ✗ existence         2 violations
  ✓ freshness
  ✗ popularity        1 violation
  ✓ cross_ecosystem
  ✓ typosquat
  ✓ allowed
  ✓ denied

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  3 violations (2 errors, 1 warning)
  5/7 rules passed
```
