# コーディング規約

## コメント・ドキュメント

### 基本方針
- **JSDocコメント**: 関数・クラスの説明は日本語で記述
- **インラインコメント**: 複雑な処理の説明は日本語で記述
- **変数名・関数名**: 英語（camelCase、PascalCase）
- **型定義**: 英語（TypeScript標準に従う）

### JSDocコメントの例

```typescript
/**
 * 生徒のボーナス閾値を取得する
 * 個別設定 > クラス設定 > デフォルト値の優先順位で取得
 * 
 * @param siteId - サイトID
 * @param studentRole - 生徒の属性
 * @param studentClass - 生徒のクラス
 * @param hasCustomBonusThreshold - 個別設定があるかどうか
 * @param customBonusThreshold - 個別設定のボーナス閾値
 * @returns ボーナス閾値
 */
export async function getStudentBonusThreshold(
  siteId: string,
  studentRole: "student" | "part_time" | "full_time",
  studentClass: string | null | undefined,
  hasCustomBonusThreshold: boolean,
  customBonusThreshold: number | null
): Promise<number> {
  // 実装...
}
```

### インラインコメントの例

```typescript
// 個別設定がある場合は個別設定を優先
if (hasCustomBonusThreshold && customBonusThreshold !== null) {
  return customBonusThreshold;
}

// クラス設定を確認
if (studentClass) {
  // データベースから取得...
}
```

## ファイル構成

### ディレクトリ構造
```
NFC/
├── app/                    # Next.js App Router
│   ├── admin/             # 管理画面
│   ├── api/               # APIエンドポイント
│   ├── kiosk/             # キオスク端末画面
│   └── ...
├── components/            # Reactコンポーネント
│   ├── admin/            # 管理画面用コンポーネント
│   └── ui/               # UIコンポーネント（shadcn/ui）
├── lib/                   # ユーティリティ関数・ヘルパー
├── types/                 # 型定義
├── migrations/            # データベースマイグレーション
└── docs/                  # ドキュメント
```

### ファイル命名規則
- **コンポーネント**: PascalCase（例：`StudentList.tsx`）
- **ユーティリティ**: kebab-case（例：`point-utils.ts`）
- **APIルート**: kebab-case（例：`access-logs/route.ts`）
- **型定義**: kebab-case（例：`student-types.ts`）

## 型定義

### 基本方針
- 共通的に使用される型は `types/index.ts` に集約
- APIレスポンスの型は必ず定義
- `any` の使用は最小限に（やむを得ない場合はコメントで理由を記載）

### 型定義の例

```typescript
/**
 * 生徒のステータス
 */
export type StudentStatus = "active" | "suspended" | "withdrawn" | "graduated" | "disabled";

/**
 * 生徒情報（API Response用）
 * 
 * 注意: idは必ずstringとして扱うこと
 * データベースのUUIDはstringとしてシリアライズされる
 */
export interface Student {
  id: string; // UUID (string)
  name: string;
  grade?: string | null;
  status: StudentStatus;
  // ...
}
```

## エラーハンドリング

### 基本方針
- エラーコードベースで判定（文字列ベースの判定は避ける）
- ユーザーに分かりやすいエラーメッセージを返す
- 開発環境では詳細なログを出力、本番環境では最小限に

### エラーハンドリングの例

```typescript
// ❌ 悪い例：文字列ベースの判定
if (error.message?.includes("admin_id")) {
  // ...
}

// ✅ 良い例：エラーコードベースの判定
if (error.code === "PGRST204" || error.code === "42703") {
  // PGRST204: 列が見つからないエラー（PostgREST）
  // 42703: undefined column エラー（PostgreSQL）
  // ...
}
```

## 定数管理

### 基本方針
- マジックナンバーは `lib/constants.ts` に集約
- 定数は `SCREAMING_SNAKE_CASE` で命名
- グループごとにオブジェクトでまとめる

### 定数定義の例

```typescript
/**
 * ポイントシステム関連の定数
 */
export const POINT_CONSTANTS = {
  /** ボーナス閾値のデフォルト値（月間入室回数） */
  DEFAULT_BONUS_THRESHOLD: 10,
  
  /** ボーナスポイントのデフォルト値 */
  DEFAULT_BONUS_POINTS: 3,
} as const;
```

## セキュリティ

### 基本方針
- **機密情報をログに出力しない**（API Key、Secret、Tokenなど）
- 本番環境での認証は必須
- 環境変数の検証は起動時に実施

### セキュリティの例

```typescript
// ❌ 悪い例：機密情報のログ出力
console.log('Secret:', process.env.API_SECRET);

// ✅ 良い例：機密情報をログに出さない
if (process.env.NODE_ENV === 'development') {
  console.log('Secret validation check performed');
}
```

## パフォーマンス

### 基本方針
- N+1クエリを避ける
- 頻繁に実行される処理はキャッシング・スロットリングを検討
- 重い処理は非同期で実行

### パフォーマンス最適化の例

```typescript
// ❌ 悪い例：毎回実行
function handleRequest() {
  checkExpensiveOperation(); // 重い処理が毎回実行される
}

// ✅ 良い例：スロットリング
let lastCheckTime = 0;
const CHECK_INTERVAL = 5 * 60 * 1000; // 5分

function handleRequest() {
  const now = Date.now();
  if (now - lastCheckTime >= CHECK_INTERVAL) {
    checkExpensiveOperation();
    lastCheckTime = now;
  }
}
```

## ロギング

### 基本方針
- 開発環境では詳細なログを出力
- 本番環境では必要最小限のログのみ
- エラーは必ずログに記録
- ログプレフィックスで出力元を明示

### ロギングの例

```typescript
// 開発環境のみ
if (process.env.NODE_ENV === 'development') {
  console.log('[Points] Processing student:', studentId);
}

// 常に出力（エラー）
console.error('[Points] Failed to add points:', error);

// 警告
console.warn('[Auth] Authentication skipped in development mode');
```

## コード品質

### チェックリスト
- [ ] TypeScriptのエラーがないこと
- [ ] ESLintの警告がないこと
- [ ] 未使用のインポート・変数がないこと
- [ ] コンソールログが適切であること
- [ ] 機密情報がコードに含まれていないこと

## 更新履歴

- 2025-01-27: 初版作成
