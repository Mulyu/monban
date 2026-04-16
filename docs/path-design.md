# monban path ルール設計

## 設計方針

- 言語非依存・AST 不要。ファイルシステムの走査（glob / パス解析）のみで完結
- 全ルールのセレクタを `path`（glob パターン）に統一
- 重複ルールを統合し、6 ルールに集約

---

## ルール一覧

| # | ルール | 概要 |
|---|--------|------|
| 1 | `forbidden` | 存在してはならないパスを定義する |
| 2 | `required` | 存在しなければならないファイルを定義する |
| 3 | `placement` | ファイルの配置先を制限する |
| 4 | `naming` | ファイル・ディレクトリの命名規則を強制する |
| 5 | `depth` | ディレクトリのネスト深度を制限する |
| 6 | `count` | ディレクトリ内のファイル数を制限する |

### 統合の経緯

| 旧ルール | 統合先 | 理由 |
|---------|--------|------|
| `extension_guard` | `forbidden` | `src/**/*.js` 禁止 = 拡張子ガード |
| `co_location` | `required` | 条件付き必須ファイル |
| `directory_structure` | `forbidden` + `required` | 禁止ディレクトリ + 必須ディレクトリ |

---

## 設定フォーマット全体

```yaml
# monban.yml
path:
  forbidden:
    - path: "**/utils/**"
      message: "utils/ は使用禁止。適切なモジュールに配置してください。"
    - path: "src/**/*.js"
      message: "src/ 内に .js は配置できません。"

  required:
    - path: "src/handlers/*"
      files: ["index.ts", "schema.ts"]
    - path: "src/components/**/*.tsx"
      exclude: ["**/*.test.tsx", "**/*.stories.tsx"]
      companions: ["{stem}.test.tsx"]

  placement:
    - path: "**/*.repository.ts"
      in: "src/infrastructure/**"

  naming:
    - path: "src/components/**/*.tsx"
      style: PascalCase
    - path: "src/**/"
      target: directory
      style: kebab-case

  depth:
    - path: "src"
      max: 4

  count:
    - path: "src/handlers"
      max: 20
```

---

## 1. forbidden — 禁止パスルール

### 目的

存在してはならないファイル・ディレクトリを定義する。

旧 `extension_guard`、`directory_structure` の禁止側も吸収する。
`src/**/*.js`（拡張子）も `**/utils/**`（ディレクトリ）も同じ glob 構文で表現できる。

### 設定

```yaml
path:
  forbidden:
    # ディレクトリ禁止
    - path: "**/utils/**"
      message: "utils/ は使用禁止。適切なモジュールに配置してください。"
    - path: "**/helpers/**"
      message: "helpers/ は使用禁止。"

    # 拡張子禁止（旧 extension_guard）
    - path: "src/**/*.js"
      message: "src/ 内に .js は配置できません。"
    - path: "src/**/*.jsx"
      message: "src/ 内に .jsx は配置できません。.tsx を使用してください。"

    # 一時ファイル
    - path: "**/*.temp.*"
      severity: warn
      message: "一時ファイルをコミットしないでください。"

    # トップレベル構造の制御（旧 directory_structure）
    - path: "src/!(domain|application|infrastructure|presentation)/"
      message: "src/ 直下に未定義のディレクトリを作成しないでください。"
```

### インターフェース

```typescript
interface ForbiddenRule {
  path: string;                  // 禁止する glob パターン
  message?: string;
  severity?: "error" | "warn";   // デフォルト: "error"
}

interface ForbiddenViolation {
  rule: "forbidden";
  path: string;
  matchedPattern: string;
  severity: "error" | "warn";
  message: string;
}
```

### 出力例

```
ERROR [forbidden] src/utils/format.ts
  utils/ は使用禁止。適切なモジュールに配置してください。

ERROR [forbidden] src/legacy/handler.js
  src/ 内に .js は配置できません。
```

---

## 2. required — 必須ファイルルール

### 目的

特定のディレクトリやファイルに対し、存在すべきファイルを定義する。2 つのモードがある:

- **files**: ディレクトリに必須のファイル（旧 `required_files` + `directory_structure` の必須側）
- **companions**: ソースファイルに対するペアファイル（旧 `co_location`）

### 設定

```yaml
path:
  required:
    # ディレクトリに必須ファイル（旧 required_files）
    - path: "src/handlers/*"
      files:
        - "index.ts"
        - "schema.ts"

    - path: "packages/*"
      files:
        - "package.json"
        - "README.md"

    # 必須ディレクトリ（旧 directory_structure の required 側）
    - path: "src"
      files:
        - "domain/"       # 末尾 / でディレクトリを指定
        - "application/"
        - "infrastructure/"

    # ペアファイル（旧 co_location）
    - path: "src/components/**/*.tsx"
      exclude: ["**/*.test.tsx", "**/*.stories.tsx"]
      companions:
        - pattern: "{stem}.test.tsx"
          required: true
        - pattern: "{stem}.stories.tsx"
          required: false   # warn のみ

    - path: "app/models/**/*.rb"
      companions:
        - pattern: "spec/models/{stem}_spec.rb"
          required: true
```

### インターフェース

```typescript
interface RequiredRule {
  path: string;                 // 対象を選択する glob パターン
  exclude?: string[];
  files?: string[];             // path がディレクトリのとき：必須ファイル名
  companions?: CompanionDef[];  // path がファイルのとき：ペアファイル
}

interface CompanionDef {
  pattern: string;     // {stem} = 拡張子なしファイル名
  required: boolean;   // true = error, false = warn
}

interface RequiredViolation {
  rule: "required";
  path: string;
  missing: string;
  kind: "file" | "companion";
  severity: "error" | "warn";
  message: string;
}
```

### 出力例

```
ERROR [required] src/handlers/invoice/
  必須ファイルが見つかりません: schema.ts

ERROR [required] src/components/UserProfile.tsx
  対応ファイルが見つかりません: UserProfile.test.tsx

WARN  [required] src/components/UserProfile.tsx
  対応ファイルが見つかりません: UserProfile.stories.tsx
```

---

## 3. placement — 配置ルール

### 目的

特定の名前パターンを持つファイルが、定められたディレクトリ内にあることを検証する。
`forbidden` の逆方向（「X はここにあるべき」vs「X はここにあってはならない」）なので独立して残す。

### 設定

```yaml
path:
  placement:
    - path: "**/*.repository.ts"
      in: "src/infrastructure/**"

    - path: "**/*.controller.rb"
      in: "app/controllers/**"

    - path: "**/*.migration.ts"
      in: "db/migrations/**"

    - path: "**/Dockerfile*"
      in: "{.,docker}/**"
```

### インターフェース

```typescript
interface PlacementRule {
  path: string;   // ファイルを選択する glob パターン
  in: string;     // 許可される場所の glob パターン
}

interface PlacementViolation {
  rule: "placement";
  path: string;
  allowedIn: string;
  message: string;
}
```

### 出力例

```
ERROR [placement] src/domain/user.repository.ts
  **/*.repository.ts は src/infrastructure/** に配置してください。
```

---

## 4. naming — 命名規則ルール

### 目的

ファイル名・ディレクトリ名の命名スタイルを強制する。

### 設定

```yaml
path:
  naming:
    - path: "src/components/**/*.tsx"
      style: PascalCase

    - path: "src/**/"
      target: directory
      style: kebab-case

    - path: "app/models/**/*.rb"
      style: snake_case

    - path: "src/hooks/**/*.ts"
      style: camelCase
      prefix: "use"

    - path: "src/domain/**/*.ts"
      style: PascalCase
      suffix: ".entity"
```

### インターフェース

```typescript
type NamingStyle =
  | "PascalCase"
  | "camelCase"
  | "kebab-case"
  | "snake_case"
  | "SCREAMING_SNAKE_CASE";

interface NamingRule {
  path: string;
  target?: "file" | "directory";   // デフォルト: "file"
  style: NamingStyle;
  prefix?: string;
  suffix?: string;
}

interface NamingViolation {
  rule: "naming";
  path: string;
  expectedStyle: NamingStyle;
  actualName: string;
  suggestedName?: string;
  message: string;
}
```

### 出力例

```
ERROR [naming] src/components/user_profile.tsx
  PascalCase が期待されています。
  現在: user_profile.tsx → 修正候補: UserProfile.tsx
```

---

## 5. depth — ネスト深度ルール

### 目的

ディレクトリの深度に上限を設ける。

### 設定

```yaml
path:
  depth:
    - path: "src"
      max: 4

    - path: "packages/*/src"
      max: 3

    exclude:
      - "**/generated/**"
      - "**/vendor/**"
```

### インターフェース

```typescript
interface DepthConfig {
  rules: DepthRule[];
  exclude?: string[];
}

interface DepthRule {
  path: string;   // 基準ディレクトリ（実パス）
  max: number;    // path からの最大深度
}

interface DepthViolation {
  rule: "depth";
  path: string;
  depth: number;
  max: number;
  base: string;
  message: string;
}
```

### 出力例

```
ERROR [depth] src/domain/user/profile/settings/theme.ts
  深度 5 は上限 4 を超えています (基準: src/)
```

---

## 6. count — ファイル数上限ルール

### 目的

1 ディレクトリに置けるファイル数を制限する。

### 設定

```yaml
path:
  count:
    - path: "src/handlers"
      max: 20

    - path: "src/components"
      max: 30
      exclude: ["index.ts"]

    warn_ratio: 0.8   # 上限の 80% で warn
```

### インターフェース

```typescript
interface CountConfig {
  rules: CountRule[];
  warn_ratio?: number;   // 0〜1、デフォルト: 0.8
}

interface CountRule {
  path: string;         // 対象ディレクトリ
  max: number;
  exclude?: string[];
}

interface CountViolation {
  rule: "count";
  directory: string;
  count: number;
  max: number;
  severity: "error" | "warn";
  message: string;
}
```

### 出力例

```
ERROR [count] src/handlers/
  ファイル数 24 が上限 20 を超えています。

WARN  [count] src/components/
  ファイル数 25 / 上限 30（83%）
```

---

## CLI

```
$ monban path

monban path — パスチェック

  ✗ forbidden     2 violations
  ✓ required
  ✗ placement     1 violation
  ✗ naming        1 violation
  ✓ depth
  ✗ count         1 violation (warn)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  5 violations (4 errors, 1 warning)
  3/6 rules passed

$ monban path --rule forbidden     # 特定ルールのみ
$ monban path --json               # JSON 出力
$ monban path --fix                # 自動修正（naming のリネーム）
```

---

## 共通インターフェース

```typescript
type PathViolation =
  | ForbiddenViolation
  | RequiredViolation
  | PlacementViolation
  | NamingViolation
  | DepthViolation
  | CountViolation;

interface PathCheckResult {
  passed: boolean;
  violations: PathViolation[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    byRule: Record<string, number>;
  };
}
```
