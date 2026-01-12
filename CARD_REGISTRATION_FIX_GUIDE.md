# カード登録・入退室タッチエラー修正ガイド

## 🔍 発見された問題

### 問題の原因
`app/api/students/[id]/route.ts` が**匿名キー（ANON_KEY）**を使用していたため、Supabaseの**Row Level Security (RLS)ポリシー**により書き込みが拒否されていました。

#### 詳細
- RLSポリシーは、管理者認証（`is_admin()`が真）の場合のみstudentsテーブルへの書き込みを許可
- 匿名キーを使用すると`auth.uid()`がnullになり、`is_admin()`が常にfalseを返す
- 結果として、カード登録時のPATCHリクエストが失敗

---

## ✅ 実施した修正

### 修正内容
`app/api/students/[id]/route.ts` で使用するSupabaseクライアントを変更：

**変更前:**
```typescript
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // ❌ 匿名キー
  );
}
```

**変更後:**
```typescript
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// getSupabaseAdmin()を使用 ✅ サービスロールキー（RLSをバイパス）
```

### 影響範囲
- **カード登録機能**: `/admin/students` 画面でのNFCカード登録
- **入退室タッチ機能**: `/kiosk/entry` および `/kiosk/exit` でのカード検証

---

## 📋 動作確認手順

### 前提条件
1. Supabaseのマイグレーションが実行済みであること
2. 環境変数が正しく設定されていること（`.env.local`）

### 1. データベースの確認

Supabaseダッシュボードで以下を確認：

#### studentsテーブルにcard_idカラムが存在するか
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'students' AND column_name = 'card_id';
```

もし存在しない場合は、以下を実行：
```sql
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS card_id TEXT NULL;
```

#### RLSポリシーが正しく設定されているか
```sql
SELECT * FROM pg_policies WHERE tablename = 'students';
```

### 2. カード登録のテスト

#### 手順
1. ブラウザで管理画面を開く: `http://localhost:3001/admin/students`
2. 生徒一覧から任意の生徒の「カード登録」ボタンをクリック
3. NFCカードをスマートフォン（Android Chrome推奨）にタッチ
4. 成功メッセージが表示されることを確認
5. 生徒一覧でカードIDが表示されることを確認

#### 期待される結果
- ✅ カードのシリアル番号が正常に読み取られる
- ✅ DBに正規化されたシリアル番号（小文字）が保存される
- ✅ 重複カードの場合はエラーメッセージが表示される

#### エラー時の確認ポイント
- ブラウザのコンソールログ（F12 → Console）
- ネットワークタブ（F12 → Network）で`PATCH /api/students/[id]`のレスポンスを確認
- サーバーログ（ターミナル）

### 3. 入退室タッチのテスト

#### 入室テスト
1. ブラウザで入室画面を開く: `http://localhost:3001/kiosk/entry`
2. 「スキャン開始」ボタンをクリック
3. 登録済みのNFCカードをタッチ
4. 生徒名と入室メッセージが表示されることを確認

#### 退室テスト
1. ブラウザで退室画面を開く: `http://localhost:3001/kiosk/exit`
2. 「スキャン開始」ボタンをクリック
3. 登録済みのNFCカードをタッチ
4. 生徒名と退室メッセージが表示されることを確認

#### 期待される結果
- ✅ カードのシリアル番号が正常に読み取られる
- ✅ `/api/cards/verify` が正しく生徒情報を返す
- ✅ `/api/access-logs` が正常にログを記録する
- ✅ 既に入室済みの場合は適切なエラーメッセージが表示される

### 4. データベースの確認

Supabaseダッシュボードで以下を確認：

#### studentsテーブル
```sql
SELECT id, name, card_id 
FROM students 
WHERE card_id IS NOT NULL 
LIMIT 10;
```
- カードIDが正しく保存されているか（小文字、前後の空白なし）

#### access_logsテーブル
```sql
SELECT * FROM access_logs 
ORDER BY timestamp DESC 
LIMIT 10;
```
- 入退室ログが正しく記録されているか

---

## 🔧 トラブルシューティング

### エラー: "カード登録に失敗しました"

#### 原因1: RLSポリシーの問題
```sql
-- RLSが有効になっているか確認
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'students';

-- ポリシーを確認
SELECT * FROM pg_policies WHERE tablename = 'students';
```

#### 原因2: サービスロールキーが設定されていない
`.env.local` を確認：
```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

#### 原因3: card_idカラムが存在しない
```sql
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS card_id TEXT NULL;
```

### エラー: "このカードは登録されていません"

#### 原因1: カードIDの正規化の不一致
- カード登録時: `serialNumber.trim().toLowerCase()`
- カード検証時: `serialNumber.trim().toLowerCase()`
→ 両方で正規化されているため、不一致は起きないはず

#### 原因2: カードIDが実際に登録されていない
```sql
SELECT id, name, card_id 
FROM students 
WHERE card_id = '登録したカードのシリアル番号（小文字）';
```

### エラー: "既に入室済みです"

これは正常な動作です。既に入室している生徒が再度入室操作を行った場合に表示されます。

解決策:
1. 管理画面 → 入退室ログ から手動で退室処理を行う
2. または、退室画面でカードをタッチする

---

## 📝 関連ファイル

### 修正したファイル
- `app/api/students/[id]/route.ts`

### 関連APIエンドポイント
- `app/api/cards/verify/route.ts` - カード検証（入退室時）
- `app/api/access-logs/route.ts` - 入退室ログ記録
- `app/api/students/route.ts` - 生徒一覧取得・作成

### クライアント側
- `app/admin/students/page.tsx` - カード登録UI
- `app/kiosk/entry/page.tsx` - 入室画面
- `app/kiosk/exit/page.tsx` - 退室画面

### データベース
- `migrations/add_card_id_to_students.sql` - card_idカラム追加
- `migrations/enable_rls_on_all_tables_safe.sql` - RLSポリシー設定

---

## ✨ 今後の推奨事項

### 1. エラーログの強化
現在のエラーメッセージに加えて、詳細なログを追加することを推奨：
```typescript
console.error("[Card Registration Error]", {
  studentId: registeringCardStudent.id,
  serialNumber: normalizedSerial,
  error: e.message,
  stack: e.stack
});
```

### 2. カードIDのユニーク制約
データベースレベルでカードIDのユニーク制約を追加：
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_card_id 
ON students(card_id) 
WHERE card_id IS NOT NULL;
```

### 3. カード登録履歴の記録
カード登録・解除の履歴を記録するテーブルを追加することを検討：
```sql
CREATE TABLE card_registration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  card_id TEXT,
  action TEXT, -- 'register' or 'unregister'
  registered_at TIMESTAMPTZ DEFAULT now(),
  registered_by UUID -- 管理者ID
);
```

---

## ✅ 修正完了チェックリスト

- [x] `app/api/students/[id]/route.ts` を修正
- [x] リンターエラーがないことを確認
- [ ] データベースマイグレーションが実行済みであることを確認
- [ ] カード登録のテストが成功することを確認
- [ ] 入退室タッチのテストが成功することを確認
- [ ] エラーログを確認し、予期しないエラーがないことを確認

---

最終更新: 2026年1月7日



