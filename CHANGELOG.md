# Changelog

## [0.2.0](https://github.com/Mulyu/monban/compare/monban-v0.1.0...monban-v0.2.0) (2026-04-19)


### ⚠ BREAKING CHANGES

* unify rule/field naming to required/forbidden/allowed

### Features

* add companions root-relative, content exclude, content.size ([c065d22](https://github.com/Mulyu/monban/commit/c065d2214fc0cfee0824564fca31c3d1cbb5dd96))
* add companions root-relative, content exclude, content.size ([a281d58](https://github.com/Mulyu/monban/commit/a281d581de50cf568d4dead7c48cde8b4d996e38))
* add monban git command (Phase 1) ([5bc8414](https://github.com/Mulyu/monban/commit/5bc8414efc015897c35e512e454162fd0609ee14))
* add thinking skill for iterative planning ([00346b9](https://github.com/Mulyu/monban/commit/00346b945ea91b17ce27e2a3efb6bee89868fc94))
* add thinking skill for iterative planning ([eea016a](https://github.com/Mulyu/monban/commit/eea016a8f7e7f16a44298366d4435ba0f9b0edf1))
* **agent:** add monban agent command (instructions / mcp / ignore) ([fa800ba](https://github.com/Mulyu/monban/commit/fa800ba9fe23cf2a9aba37a062f0f7da9aa05921))
* **agent:** add new monban agent command with 3 rules ([c261410](https://github.com/Mulyu/monban/commit/c26141071194f77700474ec335b4d562c5276405))
* **cli:** discipline exit codes 0/1/2 with ConfigError ([dca74b6](https://github.com/Mulyu/monban/commit/dca74b6eeaa68fd843425bf864a1f762b01246ec))
* **cli:** exit code discipline (0/1/2) + ConfigError ([28afc66](https://github.com/Mulyu/monban/commit/28afc66ec0846faf0636c1bd8014f7cb8a483bdb))
* **content:** add injection/conflict presets and within_lines scope ([a8f18d3](https://github.com/Mulyu/monban/commit/a8f18d33a710c9a4ffa968b650831a6aee7ac625))
* **content:** injection/conflict presets + within_lines scope ([baa0760](https://github.com/Mulyu/monban/commit/baa0760bd50af23580d0f6e01404941670f79061))
* **deps:** add install_scripts, git_dependency, floating_version rules ([76fa4df](https://github.com/Mulyu/monban/commit/76fa4dfc85163ebb529a75a06c9ee61921fdabc9))
* **deps:** add install_scripts, git_dependency, floating_version rules ([42be23b](https://github.com/Mulyu/monban/commit/42be23bd6ae646f8d34da59e1677d6b306a5e3d9))
* expand monban.yml with supply-chain & CI safety rules ([616cbc5](https://github.com/Mulyu/monban/commit/616cbc58dc06395b0e66be9c26ba0056fa366b67))
* expand monban.yml with supply-chain & CI safety rules ([74c6d34](https://github.com/Mulyu/monban/commit/74c6d34c4f193d47c4872ce15a16413716929b76))
* **git:** add branch_name and tag_name rules ([81453ae](https://github.com/Mulyu/monban/commit/81453aec4a607cce154fb7a46ce932b33dc6ae69))
* **git:** add branch_name and tag_name rules ([a355979](https://github.com/Mulyu/monban/commit/a35597938863b1ca5ef6d6e0515dd54544de0738))
* **github:** add actions.danger and actions.injection rules ([681bc01](https://github.com/Mulyu/monban/commit/681bc013f0de981d922c6d81a179fcc7d71248ba))
* **github:** add actions.danger and actions.injection rules ([a14a796](https://github.com/Mulyu/monban/commit/a14a796ba4fb02c90ed202e2d895a8c65d39d2ba))
* **github:** redesign monban actions as monban github with 11 rules ([c2ef1fb](https://github.com/Mulyu/monban/commit/c2ef1fb6b5746b4c59c6e4d18ae916c6957d1b86))
* **github:** redesign monban actions as monban github with 11 rules ([e902e91](https://github.com/Mulyu/monban/commit/e902e91bdffab4a520b5938cd9753ef62affb2fb))
* implement git.commit.references (Phase 2) and drop Phase 3/4 ([9eb76e8](https://github.com/Mulyu/monban/commit/9eb76e88a0a482ede78d892fefcdcc4f58beb816))
* implement git.commit.references (Phase 2) and drop Phase 3/4 ([eecb8bc](https://github.com/Mulyu/monban/commit/eecb8bcf01154db3e2fddb8c91e254b25aa4dd3b))
* implement monban deps command and --diff flag ([088cfd3](https://github.com/Mulyu/monban/commit/088cfd3dda68bc477b855ea460c5872fdfe7c506))
* implement monban deps command and --diff flag ([30e7e48](https://github.com/Mulyu/monban/commit/30e7e4899768e4f16dec059125bc1326308d0ef3))
* monban git コマンドの Phase 1 実装 ([92ea797](https://github.com/Mulyu/monban/commit/92ea797613cb63507e5175814678cfc9f9735181))
* **path:** add hash, size, case_conflict + count.min + forbidden.type ([94baffb](https://github.com/Mulyu/monban/commit/94baffb8c8baab810fe5731913c9cc5b2ff540db))
* **path:** add hash, size, case_conflict + count.min + forbidden.type ([1b00ad5](https://github.com/Mulyu/monban/commit/1b00ad5433fc02cac31c4e7f1ba2ccb72708418e))


### Bug Fixes

* **deps:** rename cross_ecosystem.ts to kebab-case ([5aa3244](https://github.com/Mulyu/monban/commit/5aa3244a49913f117aaa64f77e88274ca3e68ba9))
* match repository.url casing to GitHub canonical Mulyu/monban ([4346c2b](https://github.com/Mulyu/monban/commit/4346c2bea4ba063e1a1d3ffd5d3abb03c6bd8cd2))
* match repository.url casing to GitHub canonical Mulyu/monban ([04ac133](https://github.com/Mulyu/monban/commit/04ac133e09300b7568b4592d785e94bb41830bad))


### Documentation

* add monban deps command and --diff flag design ([b250f21](https://github.com/Mulyu/monban/commit/b250f2162acc049305189f0bcfd7e552bbd33621))
* add monban deps command and --diff flag design ([c65d8c0](https://github.com/Mulyu/monban/commit/c65d8c0ab65ca80a56e9ac825d07451e0cd5e76b))
* add monban git command documentation ([48be71b](https://github.com/Mulyu/monban/commit/48be71b405acb9706c9ea2be6a7ed1b051079fb8))
* **decisions:** record fail_text/docs_url rejection ([02b99c0](https://github.com/Mulyu/monban/commit/02b99c01be1fcd53a4c72c1c24b7015aad79503c))
* **decisions:** record fail_text/docs_url rejection ([1007211](https://github.com/Mulyu/monban/commit/1007211973438118e2a7b8335f51fc44e551e32d))
* **direction:** restructure decisions.md as tables ([b61c469](https://github.com/Mulyu/monban/commit/b61c4694874675caa71abb3a5a056c2c4a267816))
* monban git コマンドのドキュメント追加 ([ecb1ad7](https://github.com/Mulyu/monban/commit/ecb1ad7699841180168087f843dc10a3a19acc8a))
* **product-design:** add diff-as-scope-filter principle and refactor decisions ([cfbcf9c](https://github.com/Mulyu/monban/commit/cfbcf9cf1693c61ca97e3ecb9b28241994418b7a))
* **product-design:** add diff-as-scope-filter principle and refactor feature decisions ([04c907c](https://github.com/Mulyu/monban/commit/04c907caa3287fc7ef53bb4fcc45d8e6efe99ec8))
* record next-feature decisions from 2026-04 web research ([46411d9](https://github.com/Mulyu/monban/commit/46411d9bd125296a9bae371f288c1ecdeed4f359))
* record next-feature decisions from 2026-04 web research ([fb97441](https://github.com/Mulyu/monban/commit/fb974417e71a23f5e925c242e1ee0137d12c6181))
* remove release procedure documentation ([57593ce](https://github.com/Mulyu/monban/commit/57593ce7ef9d0310eaf59ba3415e995f3a125593))
* reorganize documentation structure ([5a6c867](https://github.com/Mulyu/monban/commit/5a6c8679b1db91e89a4eb2c2b16aa81070e85e9b))
* **skill:** add monban github command and feature decision log ([d1a0193](https://github.com/Mulyu/monban/commit/d1a019331a1c005bf1ee5b59de74a4480323f81b))
* **skill:** add monban github command and feature decision log ([25cf18e](https://github.com/Mulyu/monban/commit/25cf18ebf1036932f79279ccc0b0c01d939b9dff))
* slim README and add docs index, getting-started, concepts ([0dd9cf9](https://github.com/Mulyu/monban/commit/0dd9cf928b72e2015c5101e2abc74fad5442b2fb))


### Refactoring

* align naming and layout conventions across modules ([a9571f7](https://github.com/Mulyu/monban/commit/a9571f72b4942079bce986eba6e943729b4226f1))
* align naming and layout conventions across modules ([56b22d7](https://github.com/Mulyu/monban/commit/56b22d73ae705268d63f0621521008cb1a7e93ac))
* **cli:** extract orchestrator layer and unify reporter dispatch ([e387ca6](https://github.com/Mulyu/monban/commit/e387ca665c1d4064a6d44bd805b79428b7447e6f))
* **cli:** extract orchestrator layer and unify reporter dispatch ([381daee](https://github.com/Mulyu/monban/commit/381daee0b81f0d530ed0fdeaa29916767cf63539))
* **config:** split schema.ts into per-category modules ([a50540b](https://github.com/Mulyu/monban/commit/a50540b25db4aead8dd2551f9d379cad5bf754bf))
* **config:** split schema.ts into per-category modules ([156388d](https://github.com/Mulyu/monban/commit/156388dd5659e28195f3451811c4fc9b5ed18827))
* introduce ports layer for HTTP and cache boundaries ([a7bde20](https://github.com/Mulyu/monban/commit/a7bde206c2d99104f1817b309c69ce5350071228))
* introduce ports layer for HTTP and cache boundaries ([14cf31f](https://github.com/Mulyu/monban/commit/14cf31f9c4c712beda94388d1a87db6223e61554))
* restructure github namespace into actions/codeowners sub-namespaces ([51dd389](https://github.com/Mulyu/monban/commit/51dd389c53838b197a5f265a2012b7b618522c1e))
* restructure github namespace into actions/codeowners sub-namespaces ([1f43eca](https://github.com/Mulyu/monban/commit/1f43eca320f9002b2bbc9a8880177f35c4a8e469))
* unify network failure handling in deps rules ([e1b71ce](https://github.com/Mulyu/monban/commit/e1b71ce30d9f63a13255baa9ef1f748ba2f40261))
* unify network failure handling in deps rules ([aa2b2f4](https://github.com/Mulyu/monban/commit/aa2b2f42481fff1820c40bf395f5c3f3309ba475))
* unify rule/field naming to required/forbidden/allowed ([81c75a0](https://github.com/Mulyu/monban/commit/81c75a0ec0467f4c2d147140072a8267c4e635a3))

## Changelog
