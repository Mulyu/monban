# monban runtime

> **日本語** | [English](./runtime.md)

`.nvmrc` / `package.json#engines` / `Dockerfile FROM` / GitHub Actions マトリクスなど、複数ファイルに散らばるランタイムバージョン指定の整合性をチェックします。

エージェントが `.nvmrc` を Node 22 に更新したのに `Dockerfile` は Node 20、GitHub Actions マトリクスは Node 18 のまま、という典型的な drift を CI で押さえるためのコマンドです。各 source からバージョン文字列を抽出し、一致しない場合に違反として報告します。

```bash
monban runtime                        # 全ルール実行
monban runtime --rule consistency     # 特定ルールのみ
monban runtime --diff=main            # diff スコープに限定（詳細: ./diff.ja.md）
monban runtime --json                 # JSON 出力
```

検査は **N → 1**：すべての source が同じ文字列に解決される必要があります。「source of truth」ファイルは概念上存在せず、source 間は対称です。比較は厳密な文字列一致（`"20.11.0"` と `">=20"` は別物として扱われます）。値を正規化したい場合は `pattern` を使ってください。

---

## ルール一覧

| # | ルール | 対象 | 概要 |
|---|--------|------|------|
| 1 | `consistency` | 任意のテキスト / JSON / YAML | 同じランタイムバージョンが複数ファイルで一貫してピン留めされていること |

---

## 設定

最短形は組み込み **preset** を指定するだけ。各ランタイムの典型的な pin 場所一式を一行で展開できます。

```yaml
# monban.yml
runtime:
  consistency:
    - preset: node
    - preset: python
```

プロジェクト固有のファイルを追加したい場合は `sources` を併記すれば、preset の sources に **追記**（連結）されます。

```yaml
runtime:
  consistency:
    - preset: node
      sources:
        - path: "infra/k8s/*.yaml"
          yaml_key: "spec.template.spec.containers.*.image"
```

preset を使わず全部自前で書くこともできます。

```yaml
runtime:
  consistency:
    - name: "node"
      sources:
        - path: ".nvmrc"
        - path: "package.json"
          json_key: "engines.node"
        - path: "Dockerfile"
          pattern: "^FROM node:([\\d.]+)"
        - path: ".github/workflows/*.yml"
          yaml_key: "jobs.*.steps.*.with.node-version"
```

ランタイム/言語ごとに複数ルールを並べられます。各ルールの `sources` 配列内で抽出方法を自由に組み合わせ可能です。

### 組み込み preset

各 preset には「値が単一のバージョン文字列で書かれる場所」のみを含めています。range 表記（`engines.node: ">=20"` や `requires-python: ">=3.12"`）は厳密一致を崩して誤検出になるため **意図的に外してあります**。range も含めたい場合は `sources` で個別に追加してください。

| Preset | Sources |
|---|---|
| `node` | `.nvmrc` · `.node-version` · `**/Dockerfile` (`FROM node:...`) · `.github/workflows/*.yml` (`with.node-version`) |
| `python` | `.python-version` · `**/Dockerfile` (`FROM python:...`) · `.github/workflows/*.yml` (`with.python-version`) |
| `ruby` | `.ruby-version` · `**/Dockerfile` (`FROM ruby:...`) · `.github/workflows/*.yml` (`with.ruby-version`) |
| `go` | `go.mod` (`go ...`) · `**/Dockerfile` (`FROM golang:...`) · `.github/workflows/*.yml` (`with.go-version`) |
| `rust` | `rust-toolchain.toml` (`channel = "..."`) · `rust-toolchain` · `.github/workflows/*.yml` (`with.toolchain`) |

---

## 1. consistency

<!-- monban:ref ../src/rules/runtime/consistency.ts sha256:98f652223a558344e304d7631bdfa8b7f9fbeb53e0f610f50d725edb29b8c984 -->

複数の source から抽出したランタイムバージョンが同一文字列に揃っていることを検証します。

### 設定

```yaml
runtime:
  consistency:
    - name: "node"
      sources:
        - path: ".nvmrc"
        - path: "package.json"
          json_key: "engines.node"
        - path: "Dockerfile"
          pattern: "^FROM node:([\\d.]+)"
        - path: ".github/workflows/*.yml"
          yaml_key: "jobs.*.steps.*.with.node-version"
      message: "node のバージョンがファイル間で食い違っています"  # 任意
      severity: error                                            # 任意（既定: error）

    - name: "python"
      sources:
        - path: ".python-version"
        - path: "pyproject.toml"
          pattern: "^requires-python\\s*=\\s*\"[^\\d]*([\\d.]+)"
```

### フィールド

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `preset` | string | いいえ\* | 組み込み preset 名（`node` / `python` / `ruby` / `go` / `rust`）。指定すると preset の sources を展開 |
| `name` | string | いいえ\* | エラーメッセージに使うラベル。`preset` 指定時は preset 名がデフォルト |
| `sources` | object[] | いいえ\* | 値を抽出する source。`preset` と併用すると preset の sources に **連結** される |
| `message` | string | いいえ | デフォルトメッセージを上書き |
| `severity` | `"error"` \| `"warn"` | いいえ | 重大度（既定 `error`） |

\* `preset` か `name` のどちらかが必須。最終的に sources が 1 件以上必要。`preset` と `sources` は連結されるのみで、上書きされることはない。

### source のフィールド

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `path` | string | はい | 抽出対象のファイル glob |
| `pattern` | string | いいえ\* | 正規表現。キャプチャグループ 1（無ければマッチ全体）が抽出値。ファイル全体（multiline）に適用 |
| `json_key` | string | いいえ\* | JSON ドキュメントへのドット区切りパス。`*` は 1 階層のキー / 配列要素にマッチ |
| `yaml_key` | string | いいえ\* | `json_key` と同じ構文。YAML としてパースした文書に適用 |

\* `pattern` / `json_key` / `yaml_key` は排他的。何も指定しなければ、ファイル全体を trim した結果を値とする。

### アルゴリズム

1. 各 source の `path` を glob 展開し、マッチした各ファイルに対して指定の方法で値（複数可）を抽出
2. 全 source の `(ファイル, 値)` データ点を値ごとにグルーピング
3. ユニーク値が 1 つなら通過
4. 2 つ以上あれば、値を 1 つでも提供したファイルすべてに対して、検出された全ユニーク値を列挙して報告

値を取得できなかった source（ファイル不在 / JSON パース失敗 / regex 不一致）は静かにスキップされ、それ単独で違反にはなりません。存在チェック・パース妥当性は `path.required` / `content.forbidden` で表現してください。

### 出力例

```
ERROR [consistency] .nvmrc
  node のバージョンが一貫していません: 18.20.0, 20.11.0, 22.0.0

ERROR [consistency] Dockerfile
  node のバージョンが一貫していません: 18.20.0, 20.11.0, 22.0.0
```

---

## 共通出力

```
$ monban runtime

monban runtime — ランタイムチェック

  ✗ consistency        4 violations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  4 violations (4 errors)
  0/1 rules passed
```
