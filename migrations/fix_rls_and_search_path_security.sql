-- セキュリティ修正マイグレーション
-- 1. point_settingsとline_followersテーブルのRLS有効化
-- 2. line_followersテーブルのRLSポリシー追加
-- 3. RPC関数のsearch_path修正

-- ============================================
-- 1. point_settingsテーブルのRLS有効化
-- ============================================
-- テーブルが存在する場合のみ実行
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'point_settings'
  ) THEN
    -- RLSを有効化
    ALTER TABLE public.point_settings ENABLE ROW LEVEL SECURITY;
    
    -- 既存のポリシーを削除して再作成（冪等性確保）
    DROP POLICY IF EXISTS "Admins can manage point_settings" ON public.point_settings;
    
    -- 管理者のみがsite_idでフィルタリングしてアクセス可能
    CREATE POLICY "Admins can manage point_settings" ON public.point_settings
      FOR ALL
      USING (
        public.is_admin()
        AND site_id = public.get_admin_site_id()
      )
      WITH CHECK (
        public.is_admin()
        AND site_id = public.get_admin_site_id()
      );
    
    RAISE NOTICE 'RLS enabled for point_settings table';
  ELSE
    RAISE NOTICE 'point_settings table does not exist, skipping';
  END IF;
END $$;

-- ============================================
-- 2. line_followersテーブルのRLS有効化とポリシー追加
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'line_followers'
  ) THEN
    -- RLSを有効化
    ALTER TABLE public.line_followers ENABLE ROW LEVEL SECURITY;
    
    -- 既存のポリシーを削除して再作成（冪等性確保）
    DROP POLICY IF EXISTS "Admins can manage line_followers" ON public.line_followers;
    
    -- 管理者のみがsite_idでフィルタリングしてアクセス可能
    CREATE POLICY "Admins can manage line_followers" ON public.line_followers
      FOR ALL
      USING (
        public.is_admin()
        AND site_id = public.get_admin_site_id()
      )
      WITH CHECK (
        public.is_admin()
        AND site_id = public.get_admin_site_id()
      );
    
    RAISE NOTICE 'RLS enabled for line_followers table';
  ELSE
    RAISE NOTICE 'line_followers table does not exist, skipping';
  END IF;
END $$;

-- ============================================
-- 3. RPC関数のsearch_path修正
-- ============================================

-- ポイント付与用RPC関数（search_path追加）
CREATE OR REPLACE FUNCTION add_points_transaction(
  p_site_id TEXT,
  p_student_id UUID,
  p_points INTEGER,
  p_transaction_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_admin_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- セキュリティ警告を解消
AS $$
DECLARE
  v_transaction_id UUID;
  v_current_points INTEGER;
BEGIN
  -- トランザクション開始（関数内で自動的にトランザクションが開始される）
  
  -- 1. ポイント履歴を追加
  INSERT INTO point_transactions (
    site_id,
    student_id,
    transaction_type,
    points,
    description,
    reference_id,
    admin_id
  ) VALUES (
    p_site_id,
    p_student_id,
    p_transaction_type,
    p_points,
    p_description,
    p_reference_id,
    p_admin_id
  ) RETURNING id INTO v_transaction_id;
  
  -- 2. 現在のポイントを取得（ロック付き）
  SELECT current_points INTO v_current_points
  FROM students
  WHERE id = p_student_id AND site_id = p_site_id
  FOR UPDATE;
  
  -- 3. ポイントを更新
  UPDATE students
  SET current_points = COALESCE(v_current_points, 0) + p_points
  WHERE id = p_student_id AND site_id = p_site_id;
  
  -- 成功
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    -- エラー時は自動的にロールバックされる
    RAISE EXCEPTION 'Failed to add points: %', SQLERRM;
END;
$$;

-- ポイント減算用RPC関数（search_path追加）
CREATE OR REPLACE FUNCTION subtract_points_transaction(
  p_site_id TEXT,
  p_student_id UUID,
  p_points INTEGER,
  p_transaction_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_admin_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- セキュリティ警告を解消
AS $$
DECLARE
  v_transaction_id UUID;
  v_current_points INTEGER;
  v_new_points INTEGER;
BEGIN
  -- トランザクション開始
  
  -- 1. 現在のポイントを取得（ロック付き）
  SELECT current_points INTO v_current_points
  FROM students
  WHERE id = p_student_id AND site_id = p_site_id
  FOR UPDATE;
  
  -- ポイント不足チェック
  IF COALESCE(v_current_points, 0) < p_points THEN
    RAISE EXCEPTION 'Insufficient points: current=% required=%', v_current_points, p_points;
  END IF;
  
  v_new_points := COALESCE(v_current_points, 0) - p_points;
  
  -- 2. ポイント履歴を追加（負の値で記録）
  INSERT INTO point_transactions (
    site_id,
    student_id,
    transaction_type,
    points,
    description,
    admin_id
  ) VALUES (
    p_site_id,
    p_student_id,
    p_transaction_type,
    -p_points,
    p_description,
    p_admin_id
  ) RETURNING id INTO v_transaction_id;
  
  -- 3. ポイントを更新
  UPDATE students
  SET current_points = v_new_points
  WHERE id = p_student_id AND site_id = p_site_id;
  
  -- 成功
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    -- エラー時は自動的にロールバックされる
    RAISE EXCEPTION 'Failed to subtract points: %', SQLERRM;
END;
$$;

-- コメント追加
COMMENT ON FUNCTION add_points_transaction IS 'ポイント付与のトランザクション処理（履歴追加とポイント更新をアトミックに実行）- search_path設定済み';
COMMENT ON FUNCTION subtract_points_transaction IS 'ポイント減算のトランザクション処理（履歴追加とポイント更新をアトミックに実行）- search_path設定済み';

-- ============================================
-- 4. 完了メッセージ
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'セキュリティ修正が完了しました:';
  RAISE NOTICE '1. point_settings テーブルのRLS有効化';
  RAISE NOTICE '2. line_followers テーブルのRLS有効化とポリシー追加';
  RAISE NOTICE '3. add_points_transaction 関数のsearch_path設定';
  RAISE NOTICE '4. subtract_points_transaction 関数のsearch_path設定';
  RAISE NOTICE '========================================';
END $$;
