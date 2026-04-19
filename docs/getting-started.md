# はじめに

monban を初めて導入するときの最短手順。

## 1. インストール

CI で使う場合はインストール不要。`npx` で都度実行できます。

```bash
# 単発実行（推奨）
npx @mulyu/monban all

# あるいはグローバルインストール
npm install -g @mulyu/monban
```

## 2. 設定ファイルを作る

プロジェクトルートに `monban.yml` を置きます。最小構成の例:

```yaml
# monban.yml
exclude:
  - "**/node_modules/**"
  - "**/dist/**"

path:
  forbidden:
    - path: "**/utils/**"
      message: "utils/ は使用禁止。適切なモジュールに配置してください。"

content:
  forbidden:
    - path: "src/**"
      pattern: "debugger"

doc:
  link:
    - path: "*.md"
    - path: "docs/**/*.md"
```

各セクションの全フィールドは以下を参照してください:

- パス構造: [path.md](path.md)
- ファイル内容: [content.md](content.md)
- ドキュメント: [doc.md](doc.md)
- GitHub: [github.md](github.md)
- Git メタデータ: [git.md](git.md)

## 3. 実行する

```bash
npx @mulyu/monban all
```

特定のチェックだけを実行する場合:

```bash
npx @mulyu/monban path
npx @mulyu/monban content --rule forbidden
npx @mulyu/monban all --json
```

## 4. CI に組み込む

GitHub Actions の例:

```yaml
- name: monban
  run: npx @mulyu/monban all
```

### 終了コード

monban はコマンドの結果を以下の終了コードで返します。CI で違反検出とツール障害を区別するときに使います。

| 終了コード | 意味 |
|-----------|------|
| `0` | すべてのチェックが pass |
| `1` | 違反（error 重大度）が 1 件以上見つかった |
| `2` | 設定エラー・YAML パース失敗・その他の実行時エラー |

`warn` 重大度のみの場合は `0` を返します（違反にカウントされません）。`monban.yml` が存在しない場合は `2`。`MONBAN_DEBUG=1` を設定すると、exit 2 時にスタックトレースも出力されます。

## 5. エージェントに守らせる

Claude Code を使う場合、`CLAUDE.md` に以下を追記すると、変更後に自動で実行されるよう促せます。

```markdown
## 変更後の確認

コードを変更したあとは必ず `npx @mulyu/monban all` を実行し、すべてのチェックがパスすることを確認すること。
```

### 違反時の修正ヒント

どのルールにも `fail_text` と `docs_url` を付けると、違反メッセージと一緒に修正ヒントが表示されます。AI エージェントが自己修復するときのヒントになります。

```yaml
content:
  forbidden:
    - path: "src/domain/**"
      pattern: "process\\.env"
      message: "domain 層で環境変数に直接アクセスしないでください。"
      fail_text: "設定は application 層で注入し、domain 層は純粋関数に保ってください。"
      docs_url: "https://example.com/runbooks/no-env-in-domain"
```

テキスト出力:

```
ERROR [forbidden] src/domain/order.ts:15
  domain 層で環境変数に直接アクセスしないでください。
  Fix: 設定は application 層で注入し、domain 層は純粋関数に保ってください。
  Docs: https://example.com/runbooks/no-env-in-domain
```

`--json` 出力では `remediation: { fail_text, docs_url }` フィールドに入ります。

## 次のステップ

- 組織共通のルールを再利用するなら [extends.md](extends.md)
- monban の設計思想は [concepts.md](concepts.md)
