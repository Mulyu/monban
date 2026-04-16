# monban arch 機能・インターフェース設計 Top 10

## 設計方針

**言語非依存・AST不要** に絞る。

- ファイルシステムの走査（glob/パス解析）のみで完結するルール
- ファイル内容の検査はプレーンテキストの正規表現マッチのみ
- TypeScript / Ruby / Python / Go など言語を問わず動作する

### スコープ外（将来の別モジュール）

| 機能 | 除外理由 |
|------|---------|
| `layer_dependency` | import 文の解析が必要 |
| `module_boundary` | import パスの解決が必要 |
| `circular_dependency` | 依存グラフの構築が必要 |

---

## Top 10 機能一覧

| # | ルール名 | 概要 | 実装難度 |
|---|---------|------|---------|
| 1 | `forbidden_path` | 禁止されたパターンのファイル・ディレクトリを検出 | 低 |
| 2 | `required_files` | 特定ディレクトリに必須ファイルが存在するか検証 | 低 |
| 3 | `naming_convention` | ファイル・ディレクトリの命名規則を強制 | 低 |
| 4 | `max_depth` | ディレクトリのネスト深度の上限を強制 | 低 |
| 5 | `file_placement` | ファイルが正しいディレクトリに配置されているか検証 | 低 |
| 6 | `co_location` | ペアで存在すべきファイルの欠落を検出 | 低 |
| 7 | `extension_guard` | 特定ディレクトリで許可・禁止する拡張子を定義 | 低 |
| 8 | `file_count_limit` | ディレクトリ内のファイル数に上限を設ける | 低 |
| 9 | `directory_structure` | ディレクトリ構造のテンプレートと実態を照合 | 中 |
| 10 | `content_pattern` | ファイル内容に対する正規表現マッチ（禁止・必須） | 中 |

---

## 1. forbidden_path — 禁止パスルール

### 目的

存在してはならないファイル・ディレクトリのパターンを定義する。AIエージェントは `utils/`、`helpers/`、`temp/` のような曖昧なディレクトリを安易に作りがち。

### 設定インターフェース

```yaml
arch:
  forbidden_path:
    rules:
      - pattern: "**/utils/**"
        message: "utils/ は使用禁止。適切なモジュールに配置してください。"
      - pattern: "**/helpers/**"
        message: "helpers/ は使用禁止。"
      - pattern: "**/*.temp.*"
        message: "一時ファイルをコミットしないでください。"
        severity: warn
      - pattern: "**/node_modules/**"
        message: "node_modules をコミットしないでください。"
```

### インターフェース定義

```typescript
interface ForbiddenPathConfig {
  rules: ForbiddenPathRule[];
}

interface ForbiddenPathRule {
  pattern: string;               // 禁止する glob パターン
  message?: string;              // カスタムエラーメッセージ
  severity?: "error" | "warn";   // デフォルト: "error"
}

interface ForbiddenPathViolation {
  rule: "forbidden_path";
  path: string;
  matchedPattern: string;
  severity: "error" | "warn";
  message: string;
}
```

### 出力例

```
ERROR [forbidden_path] src/utils/format.rb
  utils/ は使用禁止。適切なモジュールに配置してください。
  パターン: **/utils/**
```

---

## 2. required_files — 必須ファイルルール

### 目的

特定のディレクトリパターンに必ず存在すべきファイルを定義する。AIエージェントは新しいモジュールを追加するとき `README`、`index` ファイル、設定ファイルなどを作り忘れる。

### 設定インターフェース

```yaml
arch:
  required_files:
    rules:
      - directory: "src/handlers/*"
        files:
          - "index.ts"
          - "schema.ts"
      - directory: "packages/*"
        files:
          - "package.json"
          - "README.md"
      - directory: "app/controllers/*"   # Rails
        files:
          - "*.rb"                       # 何らかの .rb ファイルが1つ以上
```

### インターフェース定義

```typescript
interface RequiredFilesConfig {
  rules: RequiredFilesRule[];
}

interface RequiredFilesRule {
  directory: string;   // 対象ディレクトリの glob パターン（末尾は /* など）
  files: string[];     // 必須ファイル名リスト（glob 可）
}

interface RequiredFilesViolation {
  rule: "required_files";
  directory: string;
  missingFile: string;
  message: string;
}
```

### 出力例

```
ERROR [required_files] src/handlers/invoice/
  必須ファイルが見つかりません: schema.ts
  このディレクトリには [index.ts, schema.ts] が必要です。
```

---

## 3. naming_convention — 命名規則ルール

### 目的

ファイル名・ディレクトリ名の命名スタイルを強制する。AIエージェントはプロジェクトの既存スタイルを把握せず、PascalCase と kebab-case が混在するなどの不一致を起こす。

### 設定インターフェース

```yaml
arch:
  naming_convention:
    rules:
      - path: "src/components/**/*.tsx"
        style: PascalCase           # UserProfile.tsx
      - path: "src/**/"
        target: directory
        style: kebab-case           # user-profile/
      - path: "app/models/**/*.rb"
        style: snake_case           # user_profile.rb
      - path: "src/hooks/**/*.ts"
        style: camelCase
        prefix: "use"              # useAuth.ts
      - path: "src/domain/**/*.ts"
        style: PascalCase
        suffix: ".entity"          # User.entity.ts （拡張子除く部分）
```

### インターフェース定義

```typescript
type NamingStyle =
  | "PascalCase"
  | "camelCase"
  | "kebab-case"
  | "snake_case"
  | "SCREAMING_SNAKE_CASE";

interface NamingConventionConfig {
  rules: NamingConventionRule[];
}

interface NamingConventionRule {
  path: string;
  target?: "file" | "directory";   // デフォルト: "file"
  style: NamingStyle;
  prefix?: string;                  // ファイルベース名の必須プレフィックス
  suffix?: string;                  // 拡張子を除いた名前の必須サフィックス
}

interface NamingConventionViolation {
  rule: "naming_convention";
  path: string;
  expectedStyle: NamingStyle;
  actualName: string;
  suggestedName?: string;          // 自動修正候補（--fix で使用）
  message: string;
}
```

### 出力例

```
ERROR [naming_convention] src/components/user_profile.tsx
  PascalCase が期待されています。
  現在: user_profile.tsx
  修正候補: UserProfile.tsx
```

---

## 4. max_depth — ネスト深度ルール

### 目的

ディレクトリのネスト深度に上限を設ける。AIエージェントは機械的にサブディレクトリを掘り続け、不必要に深い構造を作る。

### 設定インターフェース

```yaml
arch:
  max_depth:
    rules:
      - base: "src"
        max: 4        # src/a/b/c/d まで（src を 0 として 4 階層）
      - base: "lib"
        max: 3
    exclude:
      - "**/generated/**"
      - "**/vendor/**"
```

### インターフェース定義

```typescript
interface MaxDepthConfig {
  rules: MaxDepthRule[];
  exclude?: string[];
}

interface MaxDepthRule {
  base: string;   // 基準ディレクトリ（glob 不可、実パス）
  max: number;    // base からの最大深度
}

interface MaxDepthViolation {
  rule: "max_depth";
  path: string;
  depth: number;
  maxAllowed: number;
  base: string;
  message: string;
}
```

### 出力例

```
ERROR [max_depth] src/domain/user/profile/settings/theme.ts
  深度 5 は上限 4 を超えています (基準: src/)
```

---

## 5. file_placement — ファイル配置ルール

### 目的

特定のファイル名パターンに一致するファイルが、定められたディレクトリ以外に存在してはならないことを検証する。

### 設定インターフェース

```yaml
arch:
  file_placement:
    rules:
      - pattern: "*.repository.ts"
        must_be_in: "src/infrastructure/**"
      - pattern: "*.controller.rb"
        must_be_in: "app/controllers/**"
      - pattern: "*.migration.ts"
        must_be_in: "db/migrations/**"
      - pattern: "Dockerfile*"
        must_be_in: "{.,docker}/**"
```

### インターフェース定義

```typescript
interface FilePlacementConfig {
  rules: FilePlacementRule[];
}

interface FilePlacementRule {
  pattern: string;       // ファイル名の glob パターン（パス含まない）
  must_be_in: string;    // 許可されるディレクトリの glob パターン
}

interface FilePlacementViolation {
  rule: "file_placement";
  path: string;
  filePattern: string;
  allowedLocation: string;
  message: string;
}
```

### 出力例

```
ERROR [file_placement] src/domain/user.repository.ts
  *.repository.ts は src/infrastructure/** に配置してください。
  現在の場所: src/domain/
```

---

## 6. co_location — コロケーションルール

### 目的

ペアまたはグループで存在すべきファイルの欠落を検出する。AIエージェントはコンポーネントやクラスを追加するとき、テストファイルやスタイルファイルを作り忘れる。

### 設定インターフェース

```yaml
arch:
  co_location:
    rules:
      - source: "src/components/**/*.tsx"
        exclude: ["**/*.test.tsx", "**/*.stories.tsx"]
        companions:
          - pattern: "{stem}.test.tsx"     # {stem} = 拡張子なしファイル名
            required: true
          - pattern: "{stem}.stories.tsx"
            required: false                # warn のみ
      - source: "app/models/**/*.rb"
        companions:
          - pattern: "spec/models/**/{stem}_spec.rb"
            required: true
```

### インターフェース定義

```typescript
interface CoLocationConfig {
  rules: CoLocationRule[];
}

interface CoLocationRule {
  source: string;
  exclude?: string[];
  companions: CompanionDef[];
}

interface CompanionDef {
  pattern: string;       // {stem} = 拡張子なしファイル名、{name} = フルファイル名
  required: boolean;
}

interface CoLocationViolation {
  rule: "co_location";
  sourceFile: string;
  missingCompanion: string;
  severity: "error" | "warn";
  message: string;
}
```

### 出力例

```
ERROR [co_location] src/components/UserProfile.tsx
  対応ファイルが見つかりません: UserProfile.test.tsx

WARN  [co_location] src/components/UserProfile.tsx
  対応ファイルが見つかりません: UserProfile.stories.tsx
```

---

## 7. extension_guard — 拡張子ガードルール

### 目的

特定のディレクトリで許可・禁止するファイル拡張子を定義する。AIエージェントは TypeScript プロジェクトの `src/` に `.js` を作ったり、バイナリやメディアファイルをソースディレクトリに置いたりする。

### 設定インターフェース

```yaml
arch:
  extension_guard:
    rules:
      - path: "src/**"
        allow: [".ts", ".tsx", ".json", ".css", ".svg"]
        message: "src/ 内は TypeScript/CSS/SVG のみ許可されています。"
      - path: "app/**"
        deny: [".js"]
        message: "app/ 内に .js は配置できません。Ruby を使用してください。"
      - path: "docs/**"
        allow: [".md", ".png", ".jpg", ".svg"]
```

### インターフェース定義

```typescript
interface ExtensionGuardConfig {
  rules: ExtensionGuardRule[];
}

interface ExtensionGuardRule {
  path: string;          // 対象ディレクトリの glob パターン
  allow?: string[];      // 許可する拡張子リスト（これ以外は全て禁止）
  deny?: string[];       // 禁止する拡張子リスト（allow と排他）
  message?: string;
}

interface ExtensionGuardViolation {
  rule: "extension_guard";
  path: string;
  extension: string;
  kind: "not_allowed" | "denied";
  message: string;
}
```

### 出力例

```
ERROR [extension_guard] src/utils/legacy.js
  src/ 内は .ts .tsx .json .css .svg のみ許可されています。
  検出された拡張子: .js
```

---

## 8. file_count_limit — ファイル数上限ルール

### 目的

1つのディレクトリに置けるファイル数の上限を設ける。AIエージェントは責務を分割せず、1ディレクトリにファイルを大量に生成しがち。ファイルが多すぎるディレクトリはリファクタリングのサインでもある。

### 設定インターフェース

```yaml
arch:
  file_count_limit:
    rules:
      - path: "src/handlers"
        max_files: 20
        recursive: false          # 直下のファイルのみカウント
      - path: "src/components"
        max_files: 30
        recursive: false
        exclude: ["index.ts"]     # カウント対象から除外
    warn_threshold: 0.8           # 上限の 80% に達したら warn
```

### インターフェース定義

```typescript
interface FileCountLimitConfig {
  rules: FileCountLimitRule[];
  warn_threshold?: number;   // 0〜1、デフォルト: 0.8
}

interface FileCountLimitRule {
  path: string;
  max_files: number;
  recursive?: boolean;       // デフォルト: false（直下のみ）
  exclude?: string[];
}

interface FileCountLimitViolation {
  rule: "file_count_limit";
  directory: string;
  count: number;
  maxAllowed: number;
  severity: "error" | "warn";
  message: string;
}
```

### 出力例

```
ERROR [file_count_limit] src/handlers/
  ファイル数 24 が上限 20 を超えています。
  サブディレクトリへの分割を検討してください。

WARN  [file_count_limit] src/components/
  ファイル数 26 が上限 30 の 80% に達しています。
```

---

## 9. directory_structure — ディレクトリ構造テンプレートルール

### 目的

プロジェクトが持つべきディレクトリ構造のテンプレートを定義し、実際の構造と照合する。AIエージェントが新機能追加時にルートに新しいトップレベルディレクトリを作成するなど、全体構造を壊すケースを検出する。

### 設定インターフェース

```yaml
arch:
  directory_structure:
    root: "."
    structure:
      src:
        required: true
        children:
          domain:
            required: true
          application:
            required: true
          infrastructure:
            required: true
          presentation:
            required: true
          "*":                        # それ以外のディレクトリは禁止
            allowed: false
            message: "src/ 直下に未定義のディレクトリを作成しないでください。"
      tests:
        required: false
      docs:
        required: false
      "*":                            # ルート直下の未定義ディレクトリは禁止
        allowed: false
        message: "プロジェクトルートに未定義のディレクトリを作成しないでください。"
```

### インターフェース定義

```typescript
interface DirectoryStructureConfig {
  root: string;
  structure: StructureNode;
}

type StructureNode = {
  [dirName: string]: DirDefinition;  // "*" は未定義ディレクトリへの適用
};

interface DirDefinition {
  required?: boolean;
  allowed?: boolean;         // false = このディレクトリは禁止
  message?: string;
  children?: StructureNode;
}

interface DirectoryStructureViolation {
  rule: "directory_structure";
  path: string;
  kind: "missing_required" | "unexpected_directory";
  message: string;
}
```

### 出力例

```
ERROR [directory_structure] src/
  必須ディレクトリが見つかりません: src/domain/

ERROR [directory_structure] src/shared/
  src/ 直下に未定義のディレクトリを作成しないでください。
  許可されているディレクトリ: domain, application, infrastructure, presentation
```

---

## 10. content_pattern — コンテンツパターンルール

### 目的

ファイル内容に対してプレーンテキストの正規表現マッチを行う。言語・ASTに依存せず、どの言語でも動作する。
「このディレクトリのファイルに特定の文字列が含まれてはいけない」「特定のヘッダーが必要」などを表現できる。

### 設定インターフェース

```yaml
arch:
  content_pattern:
    rules:
      - path: "src/domain/**"
        forbidden:
          - pattern: "process\\.env"
            message: "domain 層で環境変数に直接アクセスしないでください。"
          - pattern: "console\\.(log|error|warn)"
            message: "domain 層に console 出力を置かないでください。"
      - path: "src/**/*.ts"
        required:
          - pattern: "^// Copyright \\d{4}"
            scope: first_line
            message: "すべてのファイルにコピーライトヘッダーが必要です。"
      - path: "**/*.go"
        forbidden:
          - pattern: "fmt\\.Println"
            severity: warn
            message: "本番コードに fmt.Println を残さないでください。"
```

### インターフェース定義

```typescript
interface ContentPatternConfig {
  rules: ContentPatternRule[];
}

interface ContentPatternRule {
  path: string;
  forbidden?: ForbiddenPattern[];
  required?: RequiredPattern[];
}

interface ForbiddenPattern {
  pattern: string;               // 正規表現文字列
  message?: string;
  severity?: "error" | "warn";   // デフォルト: "error"
}

interface RequiredPattern {
  pattern: string;
  scope?: "file" | "first_line" | "last_line";   // デフォルト: "file"
  message?: string;
}

interface ContentPatternViolation {
  rule: "content_pattern";
  path: string;
  line?: number;
  kind: "forbidden_match" | "missing_required";
  matchedPattern: string;
  severity: "error" | "warn";
  message: string;
}
```

### 出力例

```
ERROR [content_pattern] src/domain/order/service.ts:15
  禁止パターン検出: process.env
  domain 層で環境変数に直接アクセスしないでください。

WARN  [content_pattern] internal/handler/user.go:42
  禁止パターン検出: fmt.Println
  本番コードに fmt.Println を残さないでください。

ERROR [content_pattern] src/billing/invoice.ts
  必須パターンが見つかりません: ^// Copyright \d{4} (先頭行)
  すべてのファイルにコピーライトヘッダーが必要です。
```

---

## 共通インターフェース

### チェック結果

```typescript
type ArchViolation =
  | ForbiddenPathViolation
  | RequiredFilesViolation
  | NamingConventionViolation
  | MaxDepthViolation
  | FilePlacementViolation
  | CoLocationViolation
  | ExtensionGuardViolation
  | FileCountLimitViolation
  | DirectoryStructureViolation
  | ContentPatternViolation;

interface ArchCheckResult {
  passed: boolean;
  violations: ArchViolation[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    byRule: Record<string, number>;
  };
}
```

### CLI

```
$ monban arch

monban arch — アーキテクチャチェック

  ✗ forbidden_path        2 violations
  ✓ required_files
  ✗ naming_convention     1 violation
  ✓ max_depth
  ✓ file_placement
  ✗ co_location           3 violations
  ✓ extension_guard
  ✗ file_count_limit      1 violation  (warn)
  ✓ directory_structure
  ✗ content_pattern       2 violations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  9 violations (8 errors, 1 warning)
  6/10 rules passed

オプション:
  --rule <name>   特定のルールのみ実行
  --json          機械可読 JSON 出力
  --fix           自動修正可能な違反を修正 (naming_convention のみ)
```

### monban.yml 全体構造

```yaml
arch:
  forbidden_path:
    rules: [...]

  required_files:
    rules: [...]

  naming_convention:
    rules: [...]

  max_depth:
    rules: [...]
    exclude: [...]

  file_placement:
    rules: [...]

  co_location:
    rules: [...]

  extension_guard:
    rules: [...]

  file_count_limit:
    rules: [...]
    warn_threshold: 0.8

  directory_structure:
    root: "."
    structure: {...}

  content_pattern:
    rules: [...]
```

---

## 実装優先度

| 優先度 | ルール | 備考 |
|--------|--------|------|
| P0 | `forbidden_path` | glob マッチのみ |
| P0 | `required_files` | ディレクトリ走査 + ファイル存在確認 |
| P0 | `naming_convention` | ファイル名の正規表現マッチ。`--fix` で rename も可能 |
| P0 | `max_depth` | パス文字列の `/` カウント |
| P0 | `extension_guard` | 拡張子の文字列マッチ |
| P1 | `file_placement` | glob マッチの組み合わせ |
| P1 | `co_location` | `{stem}` 展開 + ファイル存在確認 |
| P1 | `file_count_limit` | ディレクトリ内ファイル数のカウント |
| P2 | `directory_structure` | YAML で定義したツリーと実ツリーの差分計算 |
| P2 | `content_pattern` | ファイル内容の正規表現スキャン |
