# monban arch 機能・インターフェース設計 Top 10

## 背景

AIコーディングエージェントは局所的なコード生成に長けている一方、以下のプロジェクト構造上のミスを頻繁に起こす:

- ファイルを間違ったディレクトリに作成する
- レイヤー境界を無視した import を書く
- 命名規則を守らない
- 必要な付随ファイル（テスト、index.ts 等）を作り忘れる
- 内部モジュールを直接 import する

`monban arch` はこれらの「構造の崩れ」を検出する 10 のルールを提供する。

---

## Top 10 機能一覧

| # | ルール名 | 概要 |
|---|---------|------|
| 1 | `layer_dependency` | レイヤー間の依存方向を強制する |
| 2 | `file_placement` | ファイルが正しいディレクトリにあるか検証する |
| 3 | `required_files` | 特定ディレクトリに必須ファイルが存在するか検証する |
| 4 | `forbidden_path` | 禁止されたファイル・ディレクトリパターンを検出する |
| 5 | `naming_convention` | ファイル・ディレクトリの命名規則を強制する |
| 6 | `module_boundary` | モジュールの公開 API（barrel export）を通さない import を検出する |
| 7 | `co_location` | ペアで存在すべきファイルの欠落を検出する |
| 8 | `max_depth` | ディレクトリのネスト深度の上限を強制する |
| 9 | `circular_dependency` | モジュール間の循環依存を検出する |
| 10 | `content_guard` | 特定ディレクトリ内でのインポート・コードパターンを制限する |

---

## 1. layer_dependency — レイヤー依存ルール

### 目的

クリーンアーキテクチャ等のレイヤー構造における依存方向を強制する。AIエージェントは手近なモジュールから直接 import しがちで、レイヤー境界を簡単に破る。

### 設定インターフェース

```yaml
arch:
  layer_dependency:
    layers:
      - name: domain
        path: "src/domain/**"
      - name: application
        path: "src/application/**"
      - name: infrastructure
        path: "src/infrastructure/**"
      - name: presentation
        path: "src/presentation/**"
    rules:
      - from: domain
        allow: []                    # domain は他のレイヤーに依存しない
      - from: application
        allow: [domain]
      - from: infrastructure
        allow: [domain, application]
      - from: presentation
        allow: [domain, application]
```

### TypeScript インターフェース

```typescript
interface LayerDependencyConfig {
  layers: LayerDefinition[];
  rules: LayerRule[];
}

interface LayerDefinition {
  name: string;
  path: string; // glob pattern
}

interface LayerRule {
  from: string;       // layer name
  allow: string[];    // allowed dependency layer names
}

interface LayerDependencyViolation {
  rule: "layer_dependency";
  file: string;           // 違反元ファイル
  importPath: string;     // 違反した import 文
  fromLayer: string;
  toLayer: string;
  message: string;
}
```

### 検出例

```
ERROR [layer_dependency] src/domain/user/entity.ts
  → import { PrismaClient } from "src/infrastructure/db/client"
  domain → infrastructure は許可されていません。
  許可されている依存先: (なし)
```

---

## 2. file_placement — ファイル配置ルール

### 目的

特定のパターンに一致するファイルが正しいディレクトリに存在することを保証する。AIエージェントはファイルを便宜上プロジェクトルートや不適切な場所に作成することがある。

### 設定インターフェース

```yaml
arch:
  file_placement:
    rules:
      - pattern: "*.repository.ts"
        must_be_in: "src/infrastructure/repositories/**"
      - pattern: "*.controller.ts"
        must_be_in: "src/presentation/controllers/**"
      - pattern: "*.entity.ts"
        must_be_in: "src/domain/**/entities/**"
      - pattern: "*.test.ts"
        must_be_in: "{src,tests}/**"
      - pattern: "*.migration.ts"
        must_be_in: "migrations/**"
```

### TypeScript インターフェース

```typescript
interface FilePlacementConfig {
  rules: FilePlacementRule[];
}

interface FilePlacementRule {
  pattern: string;      // ファイル名の glob パターン
  must_be_in: string;   // 許可されるディレクトリの glob パターン
}

interface FilePlacementViolation {
  rule: "file_placement";
  file: string;
  expectedLocation: string;
  message: string;
}
```

### 検出例

```
ERROR [file_placement] src/domain/user.repository.ts
  *.repository.ts は src/infrastructure/repositories/** に配置してください。
  検出場所: src/domain/
```

---

## 3. required_files — 必須ファイルルール

### 目的

特定のディレクトリパターンにマッチするディレクトリに、必ず存在すべきファイルを定義する。AIエージェントはモジュールを追加する際に index.ts や README を作り忘れる。

### 設定インターフェース

```yaml
arch:
  required_files:
    rules:
      - directory: "src/handlers/*"
        files:
          - "index.ts"
          - "schema.ts"
      - directory: "src/domain/*/entities"
        files:
          - "index.ts"
      - directory: "packages/*"
        files:
          - "package.json"
          - "README.md"
          - "tsconfig.json"
```

### TypeScript インターフェース

```typescript
interface RequiredFilesConfig {
  rules: RequiredFilesRule[];
}

interface RequiredFilesRule {
  directory: string;    // ディレクトリの glob パターン
  files: string[];      // 必須ファイル名リスト
}

interface RequiredFilesViolation {
  rule: "required_files";
  directory: string;
  missingFile: string;
  message: string;
}
```

### 検出例

```
ERROR [required_files] src/handlers/invoice/
  必須ファイルが見つかりません: schema.ts
  このディレクトリには [index.ts, schema.ts] が必要です。
```

---

## 4. forbidden_path — 禁止パスルール

### 目的

存在してはならないファイルやディレクトリのパターンを定義する。AIエージェントは utils/ や helpers/ のような曖昧なディレクトリを安易に作りがち。

### 設定インターフェース

```yaml
arch:
  forbidden_path:
    rules:
      - pattern: "**/utils/**"
        message: "utils/ は使用禁止です。適切なドメインモジュールに配置してください。"
      - pattern: "**/helpers/**"
        message: "helpers/ は使用禁止です。"
      - pattern: "src/**/*.js"
        message: "src/ 内に .js ファイルは配置できません。TypeScript を使用してください。"
      - pattern: "src/**/*.temp.*"
        message: "一時ファイルをコミットしないでください。"
```

### TypeScript インターフェース

```typescript
interface ForbiddenPathConfig {
  rules: ForbiddenPathRule[];
}

interface ForbiddenPathRule {
  pattern: string;     // 禁止する glob パターン
  message?: string;    // カスタムエラーメッセージ
  severity?: "error" | "warn";
}

interface ForbiddenPathViolation {
  rule: "forbidden_path";
  file: string;
  pattern: string;
  message: string;
}
```

### 検出例

```
ERROR [forbidden_path] src/utils/format.ts
  utils/ は使用禁止です。適切なドメインモジュールに配置してください。
  マッチしたパターン: **/utils/**
```

---

## 5. naming_convention — 命名規則ルール

### 目的

ファイル名・ディレクトリ名の命名規則を強制する。AIエージェントはプロジェクトの既存命名規則を把握せずにファイルを作成し、PascalCase と kebab-case が混在するなどの不一致を起こす。

### 設定インターフェース

```yaml
arch:
  naming_convention:
    rules:
      - path: "src/components/**/*.tsx"
        style: PascalCase            # UserProfile.tsx
      - path: "src/hooks/**/*.ts"
        style: camelCase             # useAuth.ts
        prefix: "use"
      - path: "src/utils/**/*.ts"
        style: kebab-case            # date-format.ts
      - path: "src/**/"
        target: directory
        style: kebab-case            # user-profile/
      - path: "src/domain/**/entities/*.ts"
        style: PascalCase
        suffix: ".entity"            # User.entity.ts
```

### TypeScript インターフェース

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
  path: string;            // 対象パスの glob パターン
  target?: "file" | "directory";  // デフォルトは "file"
  style: NamingStyle;
  prefix?: string;
  suffix?: string;
}

interface NamingConventionViolation {
  rule: "naming_convention";
  file: string;
  expectedStyle: NamingStyle;
  actualName: string;
  suggestedName: string;
  message: string;
}
```

### 検出例

```
ERROR [naming_convention] src/components/user_profile.tsx
  ファイル名が PascalCase ではありません。
  現在の名前:   user_profile.tsx
  推奨される名前: UserProfile.tsx
```

---

## 6. module_boundary — モジュール境界ルール

### 目的

モジュールの公開 API（index.ts 等のバレルエクスポート）を経由せず、内部ファイルを直接 import することを禁止する。AIエージェントはオートコンプリートの延長で内部パスを直接 import しがち。

### 設定インターフェース

```yaml
arch:
  module_boundary:
    modules:
      - path: "src/auth"
        entry_points:
          - "index.ts"
      - path: "src/billing"
        entry_points:
          - "index.ts"
          - "types.ts"
      - path: "packages/*"
        entry_points:
          - "src/index.ts"
    allow_internal_access_from:
      - "**/*.test.ts"              # テストファイルは内部アクセス許可
      - "**/*.spec.ts"
```

### TypeScript インターフェース

```typescript
interface ModuleBoundaryConfig {
  modules: ModuleDefinition[];
  allow_internal_access_from?: string[];
}

interface ModuleDefinition {
  path: string;             // モジュールルートの glob パターン
  entry_points: string[];   // 公開エントリーポイント（相対パス）
}

interface ModuleBoundaryViolation {
  rule: "module_boundary";
  file: string;
  importPath: string;
  module: string;
  allowedEntryPoints: string[];
  message: string;
}
```

### 検出例

```
ERROR [module_boundary] src/presentation/controllers/order.ts
  → import { validateToken } from "src/auth/internal/token-validator"
  src/auth の内部ファイルに直接アクセスしています。
  許可されたエントリーポイント: src/auth/index.ts
```

---

## 7. co_location — コロケーションルール

### 目的

ペアまたはグループで存在すべきファイルの欠落を検出する。AIエージェントはコンポーネントを追加する際にテストファイルやスタイルファイルを作り忘れる。

### 設定インターフェース

```yaml
arch:
  co_location:
    rules:
      - source: "src/components/**/*.tsx"
        companions:
          - pattern: "{name}.test.tsx"    # {name} はソースのベース名
            required: true
          - pattern: "{name}.module.css"
            required: false               # warn のみ
      - source: "src/handlers/**/*.ts"
        exclude: ["**/index.ts"]
        companions:
          - pattern: "{name}.test.ts"
            required: true
      - source: "src/domain/**/entities/*.ts"
        companions:
          - pattern: "{name}.test.ts"
            required: true
```

### TypeScript インターフェース

```typescript
interface CoLocationConfig {
  rules: CoLocationRule[];
}

interface CoLocationRule {
  source: string;              // 基準ファイルの glob パターン
  exclude?: string[];          // 除外パターン
  companions: CompanionFile[];
}

interface CompanionFile {
  pattern: string;     // {name} はソースファイルのベース名に展開される
  required: boolean;   // true=error, false=warn
}

interface CoLocationViolation {
  rule: "co_location";
  sourceFile: string;
  missingCompanion: string;
  severity: "error" | "warn";
  message: string;
}
```

### 検出例

```
ERROR [co_location] src/components/UserProfile.tsx
  ペアファイルが見つかりません: UserProfile.test.tsx
  src/components/UserProfile.tsx には対応するテストファイルが必要です。

WARN  [co_location] src/components/UserProfile.tsx
  ペアファイルが見つかりません: UserProfile.module.css
```

---

## 8. max_depth — ネスト深度ルール

### 目的

ディレクトリのネスト深度に上限を設ける。AIエージェントは機械的にサブディレクトリを作成し、過度にネストした構造を生み出すことがある。

### 設定インターフェース

```yaml
arch:
  max_depth:
    rules:
      - path: "src/**"
        max: 5                         # src/ から 5 階層まで
      - path: "packages/*/src/**"
        max: 4
    exclude:
      - "node_modules/**"
      - "**/generated/**"
```

### TypeScript インターフェース

```typescript
interface MaxDepthConfig {
  rules: MaxDepthRule[];
  exclude?: string[];
}

interface MaxDepthRule {
  path: string;   // 基準パスの glob パターン
  max: number;    // 基準パスからの最大深度
}

interface MaxDepthViolation {
  rule: "max_depth";
  file: string;
  depth: number;
  maxAllowed: number;
  basePath: string;
  message: string;
}
```

### 検出例

```
ERROR [max_depth] src/domain/user/profile/settings/preferences/theme.ts
  ネスト深度が上限を超えています: 6 (最大: 5)
  基準パス: src/
  ディレクトリ構造をフラット化してください。
```

---

## 9. circular_dependency — 循環依存ルール

### 目的

モジュール間（ディレクトリ単位）の循環依存を検出する。AIエージェントはファイル間の依存関係を全体的に把握せず、結果として循環参照を作り出す。

### 設定インターフェース

```yaml
arch:
  circular_dependency:
    scope: "src/**/*.ts"
    module_resolution: directory       # ファイル単位ではなくディレクトリ単位で検出
    granularity: top_level             # src/ 直下のディレクトリ間のみチェック
    ignore:
      - from: "src/types"             # 型定義ディレクトリは除外
      - pattern: "**/*.test.ts"
    max_chain_length: 10               # 報告する循環チェーンの最大長
```

### TypeScript インターフェース

```typescript
interface CircularDependencyConfig {
  scope: string;
  module_resolution?: "file" | "directory";
  granularity?: "top_level" | "all";
  ignore?: CircularDependencyIgnore[];
  max_chain_length?: number;
}

interface CircularDependencyIgnore {
  from?: string;
  to?: string;
  pattern?: string;
}

interface CircularDependencyViolation {
  rule: "circular_dependency";
  chain: string[];         // 循環のパス（モジュール名の配列）
  message: string;
}
```

### 検出例

```
ERROR [circular_dependency] モジュール間の循環依存を検出しました:
  src/auth → src/billing → src/notification → src/auth
  3 モジュールが循環しています。依存方向を整理してください。
```

---

## 10. content_guard — コンテンツガードルール

### 目的

特定ディレクトリ内のファイルが含んではならない、または含むべきインポート・コードパターンを定義する。レイヤー依存ルールよりも柔軟に、特定のライブラリやパターンの使用を制限できる。

### 設定インターフェース

```yaml
arch:
  content_guard:
    rules:
      - path: "src/domain/**/*.ts"
        forbidden_imports:
          - pattern: "express"
            message: "domain 層で express を直接使用しないでください。"
          - pattern: "prisma"
            message: "domain 層で Prisma を直接使用しないでください。"
        forbidden_patterns:
          - pattern: "process\\.env"
            message: "domain 層で環境変数に直接アクセスしないでください。"
      - path: "src/presentation/**/*.ts"
        forbidden_imports:
          - pattern: "src/infrastructure"
            message: "presentation から infrastructure を直接参照しないでください。"
      - path: "src/**/*.ts"
        required_patterns:
          - pattern: "^// Copyright"
            scope: first_line
            message: "すべての .ts ファイルにはコピーライトヘッダーが必要です。"
```

### TypeScript インターフェース

```typescript
interface ContentGuardConfig {
  rules: ContentGuardRule[];
}

interface ContentGuardRule {
  path: string;
  forbidden_imports?: PatternWithMessage[];
  forbidden_patterns?: PatternWithMessage[];
  required_patterns?: RequiredPattern[];
}

interface PatternWithMessage {
  pattern: string;     // 正規表現パターン
  message?: string;
}

interface RequiredPattern {
  pattern: string;
  scope?: "file" | "first_line" | "last_line";
  message?: string;
}

interface ContentGuardViolation {
  rule: "content_guard";
  file: string;
  line?: number;
  matchedPattern: string;
  kind: "forbidden_import" | "forbidden_pattern" | "missing_required_pattern";
  message: string;
}
```

### 検出例

```
ERROR [content_guard] src/domain/order/service.ts:3
  → import { PrismaClient } from "@prisma/client"
  domain 層で Prisma を直接使用しないでください。

ERROR [content_guard] src/domain/order/service.ts:15
  → const db = process.env.DATABASE_URL
  domain 層で環境変数に直接アクセスしないでください。
```

---

## 共通インターフェース

### チェック結果

```typescript
// すべての Violation 型のユニオン
type ArchViolation =
  | LayerDependencyViolation
  | FilePlacementViolation
  | RequiredFilesViolation
  | ForbiddenPathViolation
  | NamingConventionViolation
  | ModuleBoundaryViolation
  | CoLocationViolation
  | MaxDepthViolation
  | CircularDependencyViolation
  | ContentGuardViolation;

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

### CLI 出力フォーマット

```
$ monban arch

monban arch — アーキテクチャチェック

  ✗ layer_dependency    2 violations
  ✗ file_placement      1 violation
  ✓ required_files
  ✗ forbidden_path      1 violation
  ✓ naming_convention
  ✗ module_boundary     1 violation
  ✓ co_location
  ✓ max_depth
  ✗ circular_dependency 1 violation
  ✓ content_guard

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  6 violations (5 errors, 1 warning)
  4/10 rules passed

$ monban arch --json     # 機械可読 JSON 出力
$ monban arch --rule layer_dependency   # 特定ルールのみ実行
$ monban arch --fix      # 自動修正可能な違反を修正（命名規則等）
```

### 設定ファイル全体構造

```yaml
# monban.yml
arch:
  # 個別に有効/無効を切り替え可能
  layer_dependency:
    enabled: true
    layers: [...]
    rules: [...]

  file_placement:
    enabled: true
    rules: [...]

  required_files:
    enabled: true
    rules: [...]

  forbidden_path:
    enabled: true
    rules: [...]

  naming_convention:
    enabled: true
    rules: [...]

  module_boundary:
    enabled: true
    modules: [...]

  co_location:
    enabled: true
    rules: [...]

  max_depth:
    enabled: true
    rules: [...]

  circular_dependency:
    enabled: true
    scope: "src/**/*.ts"

  content_guard:
    enabled: true
    rules: [...]
```

---

## 優先度と実装順序

| 優先度 | ルール | 理由 |
|--------|--------|------|
| P0 (必須) | `forbidden_path` | 実装が最も単純。glob マッチのみ。 |
| P0 (必須) | `required_files` | 同上。ディレクトリ走査 + 存在チェック。 |
| P0 (必須) | `naming_convention` | ファイル名のパターンマッチのみ。 |
| P0 (必須) | `max_depth` | パス文字列の解析のみ。 |
| P1 (重要) | `file_placement` | glob マッチの組み合わせ。 |
| P1 (重要) | `co_location` | ペアファイルの存在チェック。 |
| P2 (中核) | `layer_dependency` | import 文の解析が必要。AST or 正規表現。 |
| P2 (中核) | `module_boundary` | 同上。import パスの解決が必要。 |
| P2 (中核) | `content_guard` | ファイル内容のパターンマッチ。 |
| P3 (高度) | `circular_dependency` | 依存グラフの構築 + 循環検出アルゴリズムが必要。 |
