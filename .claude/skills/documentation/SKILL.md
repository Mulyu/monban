---
name: documentation
description: monban のドキュメントを日英二言語で整備するときに使う。新規ドキュメント追加・既存編集・命名規約・相互リンク・<!-- monban:ref --> 維持・monban.yml の除外設定の判断時にトリガーする。
---

# documentation

monban は公開ツールであり、ドキュメントは **英語を既定・日本語をミラー** として 2 言語で整備する。

## 命名規約

- **英語版**: 拡張子なし — `README.md` / `docs/path.md` / `docs/content.md`
- **日本語版**: `.ja.md` 接尾辞 — `README.ja.md` / `docs/path.ja.md` / `docs/content.ja.md`
- 同一トピックの 2 言語版は **兄弟ファイル** として並べる（`docs/en/` のようなサブディレクトリで分けない）

## 言語セレクタヘッダー

各ファイルの H1 直下に、現在言語を太字・他言語をリンクで表すセレクタを置く。

英語版:

```markdown
# <Title>

> [日本語](./<basename>.ja.md) | **English**
```

日本語版:

```markdown
# <タイトル>

> **日本語** | [English](./<basename>.md)
```

トップレベル `README.md` / `README.ja.md` も同形式。

## 内部リンク

兄弟参照は **同言語の対応版** を指す。

- 英語版 (`docs/foo.md`) の `[bar](bar.md)` → 英語版 `bar.md`
- 日本語版 (`docs/foo.ja.md`) の `[bar](bar.ja.md)` → 日本語版 `bar.ja.md`

トップレベル README からの参照も同じ規則:

- `README.md` → `docs/foo.md`
- `README.ja.md` → `docs/foo.ja.md`

## monban:ref マーカー

ソース整合性チェック用の `<!-- monban:ref ../src/... sha256:... -->` は **両言語版で同一** に保つ。

- 同じパス、同じハッシュ（ソース実体は 1 つなのでハッシュも 1 つ）
- ソースが変わったら両言語版のハッシュを同時に更新
- 監査は `monban doc --rule ref` が両方を一括チェックする（`doc.ref.path: "docs/**/*.md"` のグロブで両方マッチ）

## 同期ルール

ドキュメントを編集するときは **両言語を同じ PR で更新** する。

- 新規追加: `foo.md` と `foo.ja.md` を同時に作成
- 内容変更: 片方だけの編集は許容しない（部分翻訳の取り残し原因）
- リネーム: 両言語版を同時にリネーム
- 削除: 両言語版を同時に削除

英語が源泉とは限らない。実装者が日本語で書いた内容を後から英訳しても、最終 PR では両方そろえる。

## 翻訳の取り扱い

- コードブロック・YAML・CLI 出力例・ファイルパス・パッケージ名は **逐語維持**
- 表のセル内テキストは翻訳、表構造は維持
- ツール固有名詞（Claude Code / Cursor / GitHub Actions / npm 等）は原語のまま
- 出力例の中の人間向けメッセージ（"BOM を含めないでください" など）はその言語に合わせて訳す
- `<!-- monban:ref -->` 行は逐語維持（ハッシュ・パスを言語ごとに変えない）

## monban.yml 設定

bilingual 構成に伴う除外:

```yaml
content:
  forbidden:
    # injection ルール自身の説明例を含むため両言語版を除外
    - path: "**/*.md"
      exclude:
        - "docs/content.md"
        - "docs/content.ja.md"
      injection: true

git:
  diff:
    size:
      exclude:
        - "**/*.ja.md"   # 翻訳ミラーは PR レビュー負荷の指標に加算しない
```

`doc.ref` / `doc.link` は `docs/**/*.md` のままで両言語版を一括検査するので追加除外は不要。

## 新規ドキュメント追加時の手順

1. 英語版 `docs/<name>.md` を H1 + 言語セレクタヘッダー付きで作成
2. 日本語版 `docs/<name>.ja.md` を作成（同じ構造、翻訳した本文）
3. ソース整合性が必要なセクションには `<!-- monban:ref ../src/... sha256:... -->` を両言語版に同一で配置
4. `docs/README.md` と `docs/README.ja.md` の索引に追加
5. ルートの `README.md` / `README.ja.md` でも紹介すべきトピックなら追記
6. `npm run build && node dist/bin.mjs all` でローカル検証
7. PR では両言語版を 1 コミットにまとめる

## アンチパターン

- 片言語のみ更新して他方を放置 → 部分翻訳の取り残し原因
- 言語別にディレクトリを分ける（`docs/en/` / `docs/ja/` 等）→ 一度この構成にしたが、検索性とリンク管理を理由に兄弟ファイル方式へ統一済み
- セレクタヘッダーを省略 → 利用者が代替言語版に到達できない
- `<!-- monban:ref -->` のハッシュを言語版ごとに変える → ソース 1 個に対し複数ハッシュは意味矛盾
- 翻訳ミラーを `git.diff.size` に加算する → 構造的に大きくなる翻訳 PR で警告が誤発動する
