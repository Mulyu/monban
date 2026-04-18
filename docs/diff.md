# --diff フラグ

`monban all` / `monban path` / `monban content` / `monban doc` / `monban github` / `monban deps` すべてに共通する、スコープフィルタ用の CLI フラグ。

PR レビューで、**今回の変更によって新規に混入した違反だけ** を報告するための機能。既存コードに昔からある TODO やレイアウト違反を毎回蒸し返さない。

- 新コマンドは追加しない。既存コマンドの挙動を変えるフラグ
- `git merge-base` と `git diff --name-only` で対象ファイルを列挙する
- 言語非依存・AST 不要は維持

```bash
monban all --diff=main                 # main との差分に限定
monban content --diff                  # 自動検出
monban deps --diff=HEAD~3..HEAD        # 任意 revision 範囲
monban all --diff=main --diff-granularity=line   # 追加行のみ検査
```

---

## スコープ決定

`--diff` で対象ファイル集合を決める優先順位:

| 優先度 | 条件 | ベース |
|---|---|---|
| 1 | `--diff=<ref>` 明示指定 | `<ref>` |
| 2 | `--diff` 単独指定 かつ CI 環境 | `GITHUB_BASE_REF` 等の PR base SHA |
| 3 | `--diff` 単独指定 かつ ローカル | `git merge-base origin/main HEAD`、失敗時は `git merge-base main HEAD` |
| 4 | フラグなし | フル走査（従来挙動） |

`<ref>` にはコミットハッシュ・ブランチ名・`A..B` 形式のリビジョン範囲・`pr:123` 等の短縮形を指定できる。

```bash
monban all --diff=main
monban all --diff=origin/main
monban all --diff=HEAD~3
monban all --diff=a1b2c3..HEAD
```

### CI 環境の自動検出

GitHub Actions では、以下のいずれかが設定されていれば `--diff` 単独指定で base を自動決定する:

| 環境変数 | 用途 |
|---|---|
| `GITHUB_BASE_REF` | Pull Request の base ブランチ |
| `GITHUB_EVENT_PATH` | イベントペイロードから `pull_request.base.sha` を取得 |

CI 以外では `git merge-base origin/main HEAD` を試し、次に `main HEAD` にフォールバックする。どちらも解決できなければ exit code 2 で失敗する。

---

## 粒度

`--diff-granularity` は差分の適用粒度を決める。

| 値 | 挙動 |
|---|---|
| `file`（既定） | 追加・変更されたファイル全体を検査 |
| `line` | 追加行のみ検査（`git diff --unified=0` の追加行セット） |

行粒度は誤検出が減るが、以下のケースを取りこぼすことがある:

- 関数削除に伴う呼び出し側の破綻
- 依存削除に伴う未使用 import の残存
- マニフェスト構造の依存整合（`deps` ルールは原則ファイル粒度で動く）

このため既定はファイル粒度。PR 時の「追加された TODO / console.log だけを叩きたい」用途で `line` を使う。

### ルールごとの粒度適用

| コマンド | `file` 挙動 | `line` 挙動 |
|---|---|---|
| `path` | 追加・変更されたファイルのみ検査 | `line` は無意味（常に `file` 扱い） |
| `content` | 変更されたファイル全体を検査 | 追加行だけを検査 |
| `doc` | 変更された Markdown のみ検査 | 追加行中のリンク / `monban:ref` のみ検査 |
| `github` | 変更された workflows のみ検査 | 追加行のみ検査（ただし YAML 構造解析は変更箇所を含む job / step 単位に拡張） |
| `deps` | 変更されたマニフェストから **追加された依存** を検査（既存依存は除外） | `file` と同一 |

`path.required`（欠落検出）など、検査対象が「ファイルの存在しない状態」そのものであるルールは、`--diff` 指定時でも関連ディレクトリが diff に含まれればフル検査に格上げされる。

---

## GitHub Actions 統合

`mulyu/monban-action` を使う場合、`base` を渡すだけで diff 計算は monban 側で行う。

```yaml
- uses: mulyu/monban-action@v1
  with:
    base: ${{ github.event.pull_request.base.sha }}
```

素の GitHub Actions から直接呼ぶ場合:

```yaml
- name: monban (diff only)
  run: npx @mulyu/monban all --diff=${{ github.event.pull_request.base.sha }}
```

PR 外の push では `--diff` を外すか、明示的なベース（`main` 等）を指定する。

---

## 実行例

```
$ monban all --diff=main

monban path     — 1 new file checked
monban content  — 追加行のみ対象、既存 TODO は除外
monban doc      — 変更された Markdown 内の参照のみ検査
monban github   — .github/workflows 変更箇所のみ検査
monban deps     — package.json の新規追加依存 3 件のみ検査

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[deps]    1 error
  package.json:5 ai-json-helper — npm レジストリに存在しません

[content] 2 errors
  src/handlers/payment.ts:42 不可視の Unicode 文字
  src/db.ts:18 禁止パターン検出: debugger

Summary: 3 errors. Blocking merge.
```

---

## 注意事項

- `--diff` は git リポジトリでのみ動作する。git 管理下でない場合は警告し、フル走査にフォールバックする
- merge commit をベースにすると差分が膨らむことがある。`--diff=origin/main` のように明示ブランチの先端を指定するのが通常推奨
- 初回コミット（親が存在しない）に対する `--diff` は全ファイル対象として扱う
