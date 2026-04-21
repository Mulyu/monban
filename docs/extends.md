# monban extends

> **日本語** | [English](./en/extends.md)

`monban.yml` に他の YAML 設定を継承させる仕組み。組織共通のベースルールや、チーム横断の標準ルールセットを再利用できる。

- ローカルファイル / GitHub リポジトリから取得可能
- git CLI ベースで取得（プライベートリポジトリも既存の Git 認証で対応）
- ルール配列は連結マージ（親の設定に子の設定を追加）

```yaml
# monban.yml
extends:
  - type: local
    path: "./shared/base.yml"

  - type: github
    repo: "myorg/monban-standards"
    ref: "main"
    path: "base.yml"

path:
  forbidden:
    - path: "src/legacy/**"  # 継承したルールに追加される
```

---

## 設定

### フィールド

トップレベルの `extends` は配列。各要素は `type: local` または `type: github`。

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `type` | `"local"` \| `"github"` | Yes | 継承元の種類 |
| `path` | string | Yes | 設定ファイルのパス |
| `repo` | string | `type: github` 時 Yes | `owner/repo` 形式のリポジトリ名 |
| `ref` | string | No | ブランチ・タグ・コミットハッシュ（省略時はデフォルトブランチ） |

---

## 1. local

プロジェクト内や親ディレクトリにある YAML ファイルを継承する。

### 設定

```yaml
extends:
  - type: local
    path: "./shared/base.yml"
  - type: local
    path: "../../common/monban-base.yml"
```

### 判定

1. `path` は `monban.yml` からの相対パスで解決
2. ファイルが存在しなければエラー
3. 読み込んだ YAML をマージ対象に追加

---

## 2. github

GitHub リポジトリから設定を取得する。git CLI で sparse clone するため、プライベートリポジトリも既存の Git 認証で扱える。

### 設定

```yaml
extends:
  - type: github
    repo: "myorg/monban-standards"
    ref: "main"
    path: "base.yml"

  # ブランチ名指定
  - type: github
    repo: "myorg/shared-rules"
    ref: "v1"
    path: "path-rules.yml"

  # コミットハッシュ指定（再現性保証）
  - type: github
    repo: "myorg/shared-rules"
    ref: "a1b2c3d4e5f6789abc0123def4567890abcdef12"
    path: "content-rules.yml"
```

### フィールド

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `type` | `"github"` | Yes | 固定 |
| `repo` | string | Yes | `owner/repo` 形式 |
| `ref` | string | No | ブランチ・タグ・コミットハッシュ（省略時はデフォルトブランチ） |
| `path` | string | Yes | リポジトリルートからの設定ファイルのパス |

### 取得処理

1. キャッシュディレクトリ（`~/.cache/monban/github/<owner>/<repo>/<ref-hash>/`）を確認
2. キャッシュミス時:
   - `git clone --depth 1 --no-checkout --filter=blob:none https://github.com/<owner>/<repo>.git <cache-dir>`
   - `git -C <cache-dir> checkout <ref> -- <path>`
3. 取得した YAML をマージ対象に追加

### 認証

- **公開リポジトリ**: 認証不要
- **プライベートリポジトリ**: 既存の Git 認証機構を利用
  - SSH 鍵
  - `~/.gitconfig` の credential helper
  - GitHub CLI (`gh auth login`) の認証情報
  - 環境変数 `GITHUB_TOKEN`（CI 環境向けフォールバック）

追加設定なしで `git clone` できる状態なら monban でも取得できる。

### ref の扱い

| `ref` の種類 | キャッシュ動作 |
|--------------|--------------|
| コミットハッシュ（40 文字の SHA） | immutable → 永続キャッシュ |
| ブランチ名・タグ | mutable → 毎回 fetch（オフライン時はキャッシュ使用） |

再現性を保証したい場合はコミットハッシュを指定する。

---

## マージ戦略

全ての `extends` を先に解決し、以下のルールでマージする:

- **ルール配列**（`path.forbidden`、`content.required` など）: **連結**
- **`exclude`** (グローバル除外): **連結**
- **スカラー値**: 後勝ち（子で上書き）

### マージ例

**base.yml:**
```yaml
exclude:
  - "**/node_modules/**"

path:
  forbidden:
    - path: "**/utils/**"
      message: "utils/ は使用禁止"
```

**monban.yml:**
```yaml
extends:
  - type: local
    path: "./base.yml"

exclude:
  - "**/dist/**"

path:
  forbidden:
    - path: "**/helpers/**"
      message: "helpers/ は使用禁止"
```

**実効設定:**
```yaml
exclude:
  - "**/node_modules/**"    # base.yml から
  - "**/dist/**"            # monban.yml から

path:
  forbidden:
    - path: "**/utils/**"
      message: "utils/ は使用禁止"      # base.yml から
    - path: "**/helpers/**"
      message: "helpers/ は使用禁止"    # monban.yml から
```

---

## 推移的解決について

継承元の YAML に更に `extends` が書かれていても、それは**解決されない**（無視される）。

シンプルさと予測可能性を優先するため、`extends` は 1 階層のみ。深い継承が必要な場合は、継承元の設定を平坦化して提供する運用にする。

---

## エラー処理

| ケース | 動作 |
|-------|------|
| ローカルファイルが存在しない | エラーで停止 |
| GitHub 取得失敗（ネットワーク不達） | エラーで停止（キャッシュがあれば使用） |
| GitHub 認証失敗 | エラーで停止（認証設定の案内付き） |
| 継承先 YAML が不正 | エラーで停止（どの `extends` が壊れているか明示） |
| `ref` が存在しない | エラーで停止 |

---

## キャッシュ

### 場所

- `~/.cache/monban/github/<owner>/<repo>/<ref>/`

### コマンド

将来的に以下のヘルパーコマンドを検討:

```bash
monban extends fetch    # 全 extends を事前取得
monban extends clear    # キャッシュクリア
```

---

## 出力例

extends で読み込まれたルールも、通常のルール実行結果として表示される:

```
$ monban all

monban all — 全チェック

  path
    ✓ forbidden
    ✗ naming        2 violations
  content
    ✓ forbidden

ERROR [naming] src/userProfile.ts
  kebab が期待されています。
  ...
```

継承ソースの可視化には `monban config print`（将来実装）を使う。
