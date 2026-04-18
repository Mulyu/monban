# リリース手順

monban のリリースは **release-please** と **npm Trusted Publishing (OIDC)** で自動化されています。
日常のリリース作業に手動の `npm publish` は不要です。

---

## 日常のフロー

1. [Conventional Commits](https://www.conventionalcommits.org/) で `main` にコミット
   - `feat: ...` → minor（0.x 系では patch、`bump-patch-for-minor-pre-major: true`）
   - `fix: ...` → patch
   - `feat!: ...` または `BREAKING CHANGE:` → 1.0 以降で major、0.x では minor
2. `main` への push で `.github/workflows/release.yml` が起動
3. release-please が **Release PR**（`chore(main): release X.Y.Z`）を自動作成／更新
4. Release PR をレビューしてマージ
5. マージ後、同ワークフローの `publish` ジョブが自動実行
   - build → test → `npm publish --provenance --access public` （OIDC）
   - GitHub Release、タグ、CHANGELOG 更新も release-please が実施

## 初回セットアップ（1 回だけ）

Trusted Publisher は「パッケージが既に npm に存在する」ことを前提にするため、
**初回だけトークン認証で publish し、その後に Trusted Publisher を登録**する必要があります。
ローカル環境を介さず CI だけで完結させる手順を以下に示します。

### 1. npm 組織の作成

1. [npmjs.com](https://www.npmjs.com/) にログイン（2FA 必須）
2. 右上アバター → **Add Organization**
3. **Organization name**: `mulyu`、**Plan**: Free で作成

### 2. npm Granular Access Token の発行

1. https://www.npmjs.com/settings/{username}/tokens/granular-access-tokens/new
2. 以下を設定:

| 項目 | 値 |
|---|---|
| Token name | `monban-bootstrap`（任意） |
| Expiration | `7 days` |
| Packages and scopes | **Scope**: `@mulyu` / Permissions: **Read and write** |

3. **Generate token** をクリック → 表示されるトークン（`npm_xxxx...`）をコピー。**この画面を閉じると二度と表示されません。**

> スコープ単位（`@mulyu`）で権限を絞ることで、万が一漏れても被害を最小化できます。

### 3. GitHub Secret に登録

1. `https://github.com/mulyu/monban/settings/secrets/actions/new`
2. **Name**: `NPM_TOKEN` / **Secret**: さきほどコピーしたトークン
3. **Add secret**

### 4. 初回 CI publish の実行

1. `https://github.com/mulyu/monban/actions/workflows/bootstrap-publish.yml` を開く
2. 右上 **Run workflow** → Branch: `main` → **Run workflow**
3. ジョブが成功することを確認（`npm publish --provenance --access public` が通る）
4. `https://www.npmjs.com/package/@mulyu/monban` が公開されていることを確認

### 5. Trusted Publisher の登録

1. `https://www.npmjs.com/package/@mulyu/monban/access` → **Settings**
2. **Publishing access** → **Trusted Publisher** → **GitHub Actions** を **Add**
3. 以下を完全一致で入力（大小文字・拡張子まで厳密）:

| 項目 | 値 |
|---|---|
| Organization or user | `mulyu` |
| Repository | `monban` |
| Workflow filename | `release.yml` |
| Environment name | （空欄） |

4. **Save**

### 6. クリーンアップ（重要）

以降は OIDC で publish するので、初回 publish 用の資産はすべて削除します。

1. **GitHub Secret を削除**
   `https://github.com/mulyu/monban/settings/secrets/actions` → `NPM_TOKEN` → Remove
2. **npm トークンを revoke**
   `https://www.npmjs.com/settings/{username}/tokens` → `monban-bootstrap` → Revoke
3. **`bootstrap-publish.yml` を削除**
   ```bash
   git switch -c chore/remove-bootstrap-publish
   git rm .github/workflows/bootstrap-publish.yml
   git commit -m "chore: remove one-time bootstrap publish workflow"
   git push -u origin chore/remove-bootstrap-publish
   ```
   PR を出してマージ。

### 7. 動作確認

`main` に Conventional Commits のコミットを 1 つ積んで、Release PR → publish が OIDC で回ることを確認:

```bash
git commit --allow-empty -m "feat: verify release pipeline"
git push origin main
```

- Release PR が `chore(main): release 0.2.0` で自動作成される
- マージ後、`release.yml` の `publish` ジョブが OIDC で publish
- npm パッケージページに **Provenance** バッジが付く

以降、手動作業は一切不要です。

---

## バージョニングポリシー

- `0.x` の間は breaking change を含めても minor bump（`bump-minor-pre-major: true`）
- `1.0.0` 到達後は [SemVer](https://semver.org/) に厳密準拠
- プレリリースが必要になった場合は release-please の `prerelease-type` を検討

## トラブルシュート

- **Release PR が作られない**: コミットが Conventional Commits 形式か確認。`chore:` のみではリリース対象にならない。
- **publish が 403 / OIDC エラー**: Trusted Publisher 設定の Organization / Repository / Workflow filename が完全一致しているか確認。
- **provenance が付かない**: `publishConfig.provenance: true` と workflow の `id-token: write` 権限を確認。
