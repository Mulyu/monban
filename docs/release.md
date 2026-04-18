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

### 1. npm 組織の作成

[npmjs.com](https://www.npmjs.com/) で `mulyu` 組織を作成（無料プランで可）。

### 2. Trusted Publisher の登録

npm にログイン → パッケージ設定 → **Publishing access** → **Trusted Publisher** として以下を登録:

| 項目 | 値 |
|---|---|
| Publisher | GitHub Actions |
| Organization | `mulyu` |
| Repository | `monban` |
| Workflow filename | `release.yml` |
| Environment name | （空欄でOK） |

> Trusted Publishing により、リポジトリに `NPM_TOKEN` を置く必要はなくなります。
> publish 時に OIDC で短命なトークンが発行され、provenance（誰がどのコミットから publish したかの検証可能な記録）も自動で付与されます。

### 3. 初回 publish（v0.1.0）

Trusted Publisher は「そのパッケージ名が既に npm 上に存在する」ことを前提にするため、
**最初の 1 回だけ**ローカルから手動で publish する必要があります。

```bash
npm login            # npm アカウントにログイン
npm run build
npm publish --access public
```

2 回目以降は `main` へのマージだけで自動化されます。

---

## バージョニングポリシー

- `0.x` の間は breaking change を含めても minor bump（`bump-minor-pre-major: true`）
- `1.0.0` 到達後は [SemVer](https://semver.org/) に厳密準拠
- プレリリースが必要になった場合は release-please の `prerelease-type` を検討

## トラブルシュート

- **Release PR が作られない**: コミットが Conventional Commits 形式か確認。`chore:` のみではリリース対象にならない。
- **publish が 403 / OIDC エラー**: Trusted Publisher 設定の Organization / Repository / Workflow filename が完全一致しているか確認。
- **provenance が付かない**: `publishConfig.provenance: true` と workflow の `id-token: write` 権限を確認。
