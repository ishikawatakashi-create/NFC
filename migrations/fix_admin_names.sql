-- 管理者名の修正
-- 「石川石川高志」→「石川 高志」に修正
-- 「YamamotoHiroaki」→「山本 裕晃」に修正

-- 注意: このSQLを実行する前に、対象の管理者のauth_user_idを確認してください
-- 確認方法: Supabaseダッシュボードの「Table Editor」→「admins」テーブルで確認

-- 方法1: メールアドレスで特定して修正（推奨）
-- 石川さんの場合（メールアドレスが分かっている場合）
UPDATE admins
SET 
  last_name = '石川',
  first_name = '高志'
WHERE 
  auth_user_id = (
    SELECT id 
    FROM auth.users 
    WHERE email = '石川さんのメールアドレス@example.com'
  )
  AND (last_name = '石川石川' OR last_name = '石川' AND first_name = '石川高志');

-- 山本さんの場合（メールアドレスが分かっている場合）
UPDATE admins
SET 
  last_name = '山本',
  first_name = '裕晃'
WHERE 
  auth_user_id = (
    SELECT id 
    FROM auth.users 
    WHERE email = '山本さんのメールアドレス@example.com'
  )
  AND (last_name = 'Yamamoto' OR last_name = 'yamamoto' OR first_name = 'YamamotoHiroaki' OR first_name = 'yamamoto hiroaki');

-- 方法2: 現在の値で直接修正（メールアドレスが分からない場合）
-- 注意: 複数の管理者が同じ名前の場合、すべて更新されます

-- 石川さんの修正
UPDATE admins
SET 
  last_name = '石川',
  first_name = '高志'
WHERE 
  (last_name = '石川石川' OR (last_name = '石川' AND first_name = '石川高志'))
  AND site_id = 'your-site-id'; -- SITE_IDを指定してください

-- 山本さんの修正
UPDATE admins
SET 
  last_name = '山本',
  first_name = '裕晃'
WHERE 
  (last_name = 'Yamamoto' OR last_name = 'yamamoto' OR first_name = 'YamamotoHiroaki' OR first_name = 'yamamoto hiroaki')
  AND site_id = 'your-site-id'; -- SITE_IDを指定してください

-- 方法3: 現在のデータを確認してから修正（最も安全）
-- まず、現在のデータを確認
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

-- 確認後、特定のIDで修正
-- UPDATE admins
-- SET 
--   last_name = '石川',
--   first_name = '高志'
-- WHERE id = '管理者のUUID';




