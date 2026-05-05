# monban deps

> **日本語** | [English](./deps.md)

依存パッケージのチェック。マニフェストから依存名を抽出し、パッケージレジストリで実在・鮮度・人気度・類似性を検証する。

- 言語非依存・AST 不要
- マニフェスト（`package.json` / `requirements.txt` / `go.mod` / `Gemfile` / `Cargo.toml` / `.github/workflows/*.yml` など）の構造パース + 外部レジストリ API 照合で完結
- セレクタは `path`（glob パターン）。エコシステムはファイル名から自動判定する
- [ecosyste.ms](https://ecosyste.ms/) の packages names API を介し、単一エンドポイントで複数レジストリを扱う

```bash
monban deps                    # 全ルール実行
monban deps --rule existence   # 特定ルールのみ
monban deps --offline          # 外部 API を叩かず allowed / forbidden のみ実行
monban deps --json             # JSON 出力
```

> `monban deps` は monban で唯一、外部ネットワークに出るコマンドである。エアギャップ環境では `--offline` を指定する。

---

## ルール一覧

| # | ルール | 概要 |
|---|--------|------|
| 1 | `allowed` | allowlist（指定名のみ許可） |
| 2 | `forbidden` | denylist（指定名を禁止） |
| 3 | `existence` | レジストリに存在しない依存名を検出する（hallucination / slopsquat 対策） |
| 4 | `cross_ecosystem` | 別エコシステムにしか存在しない名前の要求を検出する |
| 5 | `typosquat` | 人気パッケージと編集距離が近い類似名を検出する |
| 6 | `freshness` | 公開から閾値以内の新規パッケージを検出する |
| 7 | `popularity` | 週間ダウンロード数が閾値未満のパッケージを検出する |
| 8 | `install_scripts` | npm lifecycle hooks（preinstall / install / postinstall / prepare）の宣言を検出する |
| 9 | `git_dependency` | レジストリ外のソース（git+ / file: / URL 直指定）の依存を検出する |
| 10 | `floating_version` | `^` / `~` / `*` / `latest` / 上限なし `>=` の浮動バージョンを検出する |

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
  allowed:
    - path: "package.json"
      names:
        - "@myorg/*"
        - my-internal-package

  forbidden:
    - path: "package.json"
      names:
        - event-stream
        - flatmap-stream
      message: "過去に compromise されたパッケージです。"

  existence:
    - path: "package.json"
    - path: "pyproject.toml"
    - path: ".github/workflows/**/*.yml"

  cross_ecosystem:
    - path: "package.json"
      severity: warn

  typosquat:
    - path: "package.json"
      max_distance: 2
      severity: warn

  freshness:
    - path: "package.json"
      max_age_hours: 24
      severity: warn

  popularity:
    - path: "package.json"
      min_downloads: 100
      severity: warn

  install_scripts:
    - path: "**/package.json"
      severity: warn
      message: "npm lifecycle hook はサプライチェーン攻撃の主要ベクトル。正当性を PR でレビュー。"
      # forbidden は省略時 [preinstall, install, postinstall, prepare]

  git_dependency:
    - path: "**/package.json"
      severity: warn

  floating_version:
    - path: "**/package.json"
      severity: warn
```

---

## 1. allowed

<!-- monban:ref ../src/rules/deps/allowed.ts sha256:de748622e19a5c802e31626fcf8a0308debdeb42ba61b051b4d5d9022fb9c14d -->

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

## 2. forbidden

<!-- monban:ref ../src/rules/deps/forbidden.ts sha256:6e8bd9e84b35b08896d0c2eb4a70939b9fe8262cc7b1cf40d2a3cc4a251d8108 -->

denylist。指定した名前を禁止する。過去に compromise されたパッケージや、内部的に置き換え済みのパッケージに使う。

### 設定

```yaml
deps:
  forbidden:
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
ERROR [forbidden] package.json:9 event-stream
  過去に compromise されたパッケージです。
```

---

## 3. existence

<!-- monban:ref ../src/rules/deps/existence.ts sha256:570784eaf4fb6d88eb7b06963ab455f2f909d78e31eb8159cdc66640e4617865 -->

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

## 4. cross_ecosystem

<!-- monban:ref ../src/rules/deps/cross-ecosystem.ts sha256:51478ead16a06c5fdb9812afa333093e6dff54779b30bb0d5103c2ef02597a16 -->

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

<!-- monban:ref ../src/rules/deps/typosquat.ts sha256:7af033128bba55bcf0dd24c7c91428140713071fea262e2d7ec3ec9e335215f7 -->

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

## 6. freshness

<!-- monban:ref ../src/rules/deps/freshness.ts sha256:8b8729afa649ef9a67584b632b729671f9ae480ba0affdcb378183dd3f2d6c08 -->

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

## 7. popularity

<!-- monban:ref ../src/rules/deps/popularity.ts sha256:82f4dd9ee83106901e01b4c68dd043a502b29cd9091ffa6571abe8437ae4710c -->

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

## 8. install_scripts

<!-- monban:ref ../src/rules/deps/install-scripts.ts sha256:9e36d0616c49632b6de87fb265f2b18df6df560e64edfa94682176226a667115 -->

npm の lifecycle hooks（`preinstall` / `install` / `postinstall` / `prepare`）が `scripts:` に宣言されていることを検出する。任意コード実行の攻撃面で、2025 年の npm 攻撃の 72% がこの経路を悪用している（Shai-Hulud ほか）。

正当な用途（monorepo bootstrap、Husky 設定など）もあるため既定は `warn`。PR レビューで個別に正当性を判断する前提で使う。

### 設定

```yaml
deps:
  install_scripts:
    - path: "**/package.json"
      severity: warn
      message: "npm lifecycle hook はサプライチェーン攻撃の主要ベクトル。"

    # prepare のみ許容（Husky / husky-init などに限定したい場合）
    - path: "**/package.json"
      forbidden: ["preinstall", "install", "postinstall"]
      severity: error
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| `path` | string | Yes | — | 対象マニフェストの glob |
| `exclude` | string[] | No | — | 除外 glob |
| `forbidden` | string[] | No | `[preinstall, install, postinstall, prepare]` | 宣言を禁止するフック名 |
| `message` | string | No | — | カスタムメッセージ |
| `severity` | `"error"` \| `"warn"` | No | `"warn"` | 重大度 |

### 出力例

```
WARN  [install_scripts] package.json:5
  preinstall ライフサイクルフックが宣言されています (任意コード実行の攻撃面)。
```

### 対応エコシステム

現時点では **npm のみ**（package.json の `scripts.{preinstall,install,postinstall,prepare}`）。PyPI の `[tool.poetry.build]`、Gemfile の `post_install_message` などは攻撃面がより狭いため将来拡張の候補。

---

## 9. git_dependency

<!-- monban:ref ../src/rules/deps/git-dependency.ts sha256:645e8d629e1fb4a5b528506480f4478a028783a8a967cf66191592baaaabaacc -->

レジストリ外のソース（git URL、ローカルパス、HTTP 直 tarball）から取得される依存を検出する。`slopsquat` / PhantomRaven（Remote Dynamic Dependencies）の典型パターンで、レジストリ監査が効かないため警戒対象。

### 検出対象

| パターン | 例 |
|---------|-----|
| `git+` / `git:` / `git@` / `ssh://` | `git+https://github.com/evil/x.git` |
| `file:` / `./` / `../` / `/` | `file:../local-lib` |
| `github:` / `gitlab:` / `bitbucket:` ショートハンド | `github:evil/x` |
| `http://` / `https://` | `https://example.com/pkg.tgz` |

### 設定

```yaml
deps:
  git_dependency:
    - path: "**/package.json"
      severity: warn
      exclude: ["tests/fixtures/**"]
    - path: "**/pyproject.toml"
      severity: warn
    - path: "**/Cargo.toml"
      severity: warn
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| `path` | string | Yes | — | 対象マニフェストの glob |
| `exclude` | string[] | No | — | 除外 glob |
| `message` | string | No | — | カスタムメッセージ |
| `severity` | `"error"` \| `"warn"` | No | `"warn"` | 重大度 |

### 対応エコシステム

npm / PyPI (pyproject.toml) / Cargo / RubyGems。Go modules と GitHub Actions は別の仕組みでバージョン管理されているため対象外。

---

## 10. floating_version

<!-- monban:ref ../src/rules/deps/floating-version.ts sha256:bb77f0bd0844efdb2a56ae5ae8eb6e33853b09d53398e8269d35d474d3713927 -->

上限のないバージョン指定を検出する。`freshness` が「未来に公開された新規パッケージ」を検査するのに対し、こちらは「未来のバージョンを許容する設定そのもの」を検査する。

### 検出対象

| パターン | 例 | エコシステム |
|---------|-----|---|
| wildcard | `*` | 全般 |
| `latest` | `latest` | 全般 |
| caret range | `^1.2.3` | npm / cargo / rubygems |
| tilde range | `~1.2.3` | npm / cargo / rubygems |
| x-range | `1.2.x` | npm / cargo / rubygems |
| unbounded lower | `>=1.0` | 全般 |

### 設定

```yaml
deps:
  floating_version:
    - path: "**/package.json"
      severity: warn
      # 社内スコープのみ ^ を許容
      allowed: ["@myorg/*"]
    - path: "**/requirements.txt"
      severity: error
```

### フィールド

| フィールド | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| `path` | string | Yes | — | 対象マニフェストの glob |
| `exclude` | string[] | No | — | 除外 glob |
| `allowed` | string[] | No | — | 浮動バージョンを許容するパッケージ名（glob 可） |
| `message` | string | No | — | カスタムメッセージ |
| `severity` | `"error"` \| `"warn"` | No | `"warn"` | 重大度 |

---

## オフラインモード

`--offline` を指定した場合、ネットワーク通信を要するルール（`existence` / `freshness` / `popularity` / `cross_ecosystem` / `typosquat`）はスキップされ、`allowed` / `forbidden` のみ実行される。エアギャップ環境や、外部 API への依存を避けたい CI 設定で使う。

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

`--diff` と組み合わせると、変更されたマニフェストに追加された依存だけを検査する。PR レビューで最も有用な使い方。詳細は [diff.md](diff.ja.md) を参照。

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
  ✓ forbidden

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  3 violations (2 errors, 1 warning)
  5/7 rules passed
```
