-- 関数のsearch_pathを修正してセキュリティ警告を解消
-- Supabaseのリンター警告に対応
-- このマイグレーションを実行すると、すべての関数のsearch_pathが適切に設定されます

-- ============================================
-- 1. is_admin関数の修正
-- ============================================
-- 管理者チェック用の関数
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.admins
    WHERE auth_user_id = auth.uid()
  );
END;
$$;

-- コメント追加
COMMENT ON FUNCTION public.is_admin() IS '現在のユーザーが管理者かどうかを判定する関数';

-- ============================================
-- 2. get_admin_site_id関数の修正
-- ============================================
-- 管理者のsite_idを取得する関数（site_idカラムを持つテーブル用）
CREATE OR REPLACE FUNCTION public.get_admin_site_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN (
    SELECT site_id
    FROM public.admins
    WHERE auth_user_id = auth.uid()
    LIMIT 1
  );
END;
$$;

-- コメント追加
COMMENT ON FUNCTION public.get_admin_site_id() IS '現在の管理者のsite_idを取得する関数（マルチテナント対応）';

-- ============================================
-- 3. set_updated_at関数の作成または修正
-- ============================================
-- updated_atカラムを自動更新する関数
-- トリガーで使用される
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- コメント追加
COMMENT ON FUNCTION public.set_updated_at() IS 'updated_atカラムを自動更新するトリガー関数';

