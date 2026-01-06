# データベース修正ガイド

## 📋 管理者名の修正方法

管理者名が「石川石川高志」や「YamamotoHiroaki」になっている場合の修正方法です。

---

## 🔧 修正手順

### 方法1: Supabaseダッシュボードから修正（最も簡単）

1. **Supabaseダッシュボードにアクセス**
   - https://app.supabase.com にログイン
   - プロジェクトを選択

2. **Table Editorを開く**
   - 左メニューから「Table Editor」をクリック
   - 「admins」テーブルを選択

3. **現在のデータを確認**
   - 管理者の一覧が表示されます
   - `last_name`と`first_name`の値を確認

4. **データを直接編集**
   - 修正したい行をクリック
   - `last_name`と`first_name`を編集
     - 石川さん: `last_name` = `石川`, `first_name` = `高志`
     - 山本さん: `last_name` = `山本`, `first_name` = `裕晃`
   - 「Save」ボタンをクリック

---

### 方法2: SQL Editorから修正（推奨）

1. **Supabaseダッシュボードにアクセス**
   - https://app.supabase.com にログイン
   - プロジェクトを選択

2. **SQL Editorを開く**
   - 左メニューから「SQL Editor」をクリック
   - 「New query」をクリック

3. **現在のデータを確認**
   ```sql
   SELECT 
     a.id,
     a.auth_user_id,
     a.site_id,
     a.last_name,
     a.first_name,
     u.email
   FROM admins a
   LEFT JOIN auth.users u ON a.auth_user_id = u.id
   ORDER BY a.created_at;
   ```
   このSQLを実行して、現在の管理者情報を確認します。

4. **修正SQLを実行**

   **石川さんの場合:**
   ```sql
   UPDATE admins
   SET 
     last_name = '石川',
     first_name = '高志'
   WHERE 
     auth_user_id = (
       SELECT id 
       FROM auth.users 
       WHERE email = '石川さんのメールアドレス@example.com'
     );
   ```
   ※ `'石川さんのメールアドレス@example.com'` を実際のメールアドレスに置き換えてください

   **山本さんの場合:**
   ```sql
   UPDATE admins
   SET 
     last_name = '山本',
     first_name = '裕晃'
   WHERE 
     auth_user_id = (
       SELECT id 
       FROM auth.users 
       WHERE email = '山本さんのメールアドレス@example.com'
     );
   ```
   ※ `'山本さんのメールアドレス@example.com'` を実際のメールアドレスに置き換えてください

5. **修正結果を確認**
   ```sql
   SELECT 
     a.id,
     a.last_name,
     a.first_name,
     u.email
   FROM admins a
   LEFT JOIN auth.users u ON a.auth_user_id = u.id;
   ```

---

### 方法3: メールアドレスが分からない場合

メールアドレスが分からない場合は、現在の値で直接修正できます。

**注意:** 複数の管理者が同じ名前の場合、すべて更新されます。

```sql
-- まず、現在のデータを確認
SELECT 
  a.id,
  a.last_name,
  a.first_name,
  u.email,
  a.site_id
FROM admins a
LEFT JOIN auth.users u ON a.auth_user_id = u.id;

-- 石川さんの修正（site_idを指定）
UPDATE admins
SET 
  last_name = '石川',
  first_name = '高志'
WHERE 
  (last_name = '石川石川' OR (last_name = '石川' AND first_name = '石川高志'))
  AND site_id = 'your-site-id'; -- .env.localのSITE_IDを指定

-- 山本さんの修正（site_idを指定）
UPDATE admins
SET 
  last_name = '山本',
  first_name = '裕晃'
WHERE 
  (last_name = 'Yamamoto' OR last_name = 'yamamoto' OR first_name = 'YamamotoHiroaki' OR first_name = 'yamamoto hiroaki')
  AND site_id = 'your-site-id'; -- .env.localのSITE_IDを指定
```

---

## ⚠️ 注意事項

1. **バックアップを取る**
   - 修正前に、必ずデータのバックアップを取ってください
   - Supabaseダッシュボードの「Table Editor」でデータをエクスポートできます

2. **SITE_IDの確認**
   - `.env.local`ファイルの`SITE_ID`の値を確認してください
   - SQLで`site_id`を指定する場合は、この値を使用します

3. **auth_user_idの確認**
   - `auth_user_id`は`auth.users`テーブルの`id`と一致している必要があります
   - 誤った`auth_user_id`で更新すると、認証ができなくなる可能性があります

4. **修正後の確認**
   - 修正後、管理画面にログインして、名前が正しく表示されるか確認してください

---

## 🔍 トラブルシューティング

### エラー: "permission denied"
- **原因:** RLS（Row Level Security）のポリシーで制限されている
- **対処法:** Supabaseダッシュボードの「Authentication」→「Policies」で、`admins`テーブルのポリシーを確認してください

### エラー: "relation does not exist"
- **原因:** テーブル名が間違っている、またはテーブルが存在しない
- **対処法:** Supabaseダッシュボードの「Table Editor」で、`admins`テーブルが存在するか確認してください

### 修正しても表示が変わらない
- **原因:** ブラウザのキャッシュ、またはアプリケーション側の表示ロジック
- **対処法:** 
  1. ブラウザのキャッシュをクリア
  2. 管理画面からログアウトして、再度ログイン
  3. データベースの値が正しく更新されているか確認

---

## 📝 参考

- マイグレーションファイル: `migrations/fix_admin_names.sql`
- テーブル定義: `migrations/create_admins_table.sql`




