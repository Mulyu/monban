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

## 5. エージェントに守らせる

Claude Code を使う場合、`CLAUDE.md` に以下を追記すると、変更後に自動で実行されるよう促せます。

```markdown
## 変更後の確認

コードを変更したあとは必ず `npx @mulyu/monban all` を実行し、すべてのチェックがパスすることを確認すること。
```

## 次のステップ

- 組織共通のルールを再利用するなら [extends.md](extends.md)
- monban の設計思想は [concepts.md](concepts.md)
