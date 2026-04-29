---
name: self-review
description: monban リポジトリ自身のセルフレビュー。ユーザーが「セルフレビュー」「最終確認」「レビューして」と要求したとき、または PR 作成・push 直前に発動する。monban の違反検出に加え、direction の設計原則と decisions.md の不採用案に新たに抵触していないかを照合する monban 固有の自己整合チェック。汎用コードレビュー（reuse / quality / efficiency）は simplify スキル、PR 単位のレビューは review スキルが担当する。
---

# monban self-review

このスキルは **monban リポジトリの設計原則と判断履歴に対する自己整合チェック** を行う。汎用的なコード品質は [`simplify`](../simplify/) や [`review`](../review/) に委譲し、ここでは **monban 固有の文脈** にだけ集中する。

## 発動条件

- ユーザーが「セルフレビュー」「最終確認」「レビューして」と発話したとき
- PR 作成・push 直前
- Stop フック (`.claude/hooks/self-check.sh`) が monban 違反を返したあと、修正方針を決める前

## スコープ外

- コードの簡潔さ・重複・効率 → `simplify` スキル
- PR 単位の総合レビュー → `review` スキル
- セキュリティ専門レビュー → `security-review` スキル
- 多視点クラウドレビュー → `/ultrareview`

## 手順

### 1. 差分の把握

```bash
git diff --stat $(git merge-base HEAD origin/main)...HEAD
git status --short
```

変更ファイルの一覧と種別（src / docs / .claude / monban.yml / package.json）を頭に入れる。

### 2. monban を差分スコープで実行

```bash
npm run --silent monban -- all --diff=$(git merge-base HEAD origin/main)
```

> `npx` は禁止。必ず `npm run monban` 経由で実行する。

違反が出たら 1 件ずつ `[rule]` と `path` を確認し、**「修正する」「monban.yml で除外する」「設定を緩める」のどれが妥当か** を判断する。

### 3. direction 設計原則との照合

[`../direction/SKILL.md`](../direction/SKILL.md) の 5 原則それぞれに、変更が抵触していないかを 1 つずつチェックする。

| 原則 | 確認ポイント |
|---|---|
| 言語非依存 | AST / import 解析 / 型情報に新たな依存を入れていないか。`monban deps` の外部 API 例外を逸脱していないか |
| 検出のみ、修正はしない | `--fix` 的な動作・自動修正・自動コミットを足していないか |
| チェックは一方向 | 「A があれば B」を逆向きにも要求するルール・フィールドを足していないか |
| 重複の排除 | 既存ルールのフィールド拡張で表現できるものを独立ルールにしていないか。同じセマンティクスに別名を与えていないか |
| diff はスコープフィルタ、判定条件ではない | 「差分に N 個以上で警告」のような差分前提ロジックを入れていないか |

抵触があれば該当変更を **不採用または再設計** する。

### 4. 命名規約との照合

[`../direction/SKILL.md`](../direction/SKILL.md) 「命名規約」に対して、新設ルール名・フィールド名・サブルール名を点検する。

- 動詞形（`allow` / `deny` / `forbid` / `require`）を使っていないか
- `denied` を新規導入していないか（→ `forbidden` に統合）
- ブール値フラグが動詞接頭辞（`forbid_X`）になっていないか
- セレクタが `pattern` ではなく `path` になっているか（content の検査用 `pattern` のみ例外）

### 5. decisions.md の不採用案との照合

[`../direction/decisions.md`](../direction/decisions.md) の **「不採用」行** をひと通り眺め、今回の変更が過去に却下した案を踏み直していないかを確認する。特に頻出する典型:

- 双方向ルール（CODEOWNERS owner→範囲、`.env.example` ↔ `.env`、AI ignore 同期 など）
- AST / 型情報 / 変数フロー解析が必要なルール
- 差分前提の判定（`diff_max` 系）
- `denied` の独立ルール化、動詞形フィールドの復活
- 別リポでのプラグイン分離、PostToolUse での自動 `monban` 実行
- スコープ外（CVE スキャン、SBOM、ライセンス、branch protection など）

抵触する場合、過去の却下理由を確認した上で **新たに採用する根拠** がなければ撤回する。採用する場合は decisions.md に **再評価の理由** を新規行として追記する。

### 6. ドキュメント整合の確認

src / 設定の変更が docs に反映されているか:

- 新規ルール → `docs/<command>.md` と `docs/<command>.ja.md` の両方に追加
- README / README.ja のコマンド対応表が古くなっていないか
- `<!-- monban:ref -->` マーカーが指す実装ファイルとの sha が一致しているか（ずれていれば `monban doc` が検知する）
- 詳細手順は [`../documentation/SKILL.md`](../documentation/SKILL.md) を参照

### 7. 報告フォーマット

レビュー結果は以下の形式で返す。

```
monban 違反: <件数> 件
  - <severity> [<rule>] <path>: <一言>
原則抵触: <件数> 件
  - <原則>: <抵触している変更の要点>
不採用案抵触: <件数> 件
  - <decisions.md の該当行>: <再採用の根拠 or 撤回方針>
ドキュメント不整合: <件数> 件
  - <該当ファイル>: <未反映の内容>

総合: 0 件なら push 可。1 件以上なら修正してから再レビュー。
```

## 委譲先との境界

| 観点 | スキル |
|---|---|
| reuse / quality / efficiency / DRY | simplify |
| PR 全体の総合レビュー | review |
| セキュリティ脆弱性 | security-review |
| 多視点クラウドレビュー | /ultrareview |
| **monban の設計原則・判断履歴整合** | **self-review（このスキル）** |
| ドキュメント二言語整備 | documentation |

self-review はあくまで monban 固有の自己整合に絞る。汎用観点は呼ばない。

## アンチパターン

- monban の違反 0 件で満足して終わる → 設計原則と decisions.md の照合まで踏むこと
- decisions.md の不採用行を流し読み → 関連する案だけでも 5 件は具体的に確認する
- 「コメント追加」「ロギング追加」など simplify の領域に踏み込む → 委譲する
