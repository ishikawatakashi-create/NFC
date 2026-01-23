-- ポイント付与・減算のトランザクション処理用RPC関数
-- 履歴追加とポイント更新をアトミックに実行

-- ポイント付与用RPC関数
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

-- ポイント減算用RPC関数
CREATE OR REPLACE FUNCTION subtract_points_transaction(
  p_site_id TEXT,
  p_student_id UUID,
  p_points INTEGER,
  p_transaction_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_admin_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
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
COMMENT ON FUNCTION add_points_transaction IS 'ポイント付与のトランザクション処理（履歴追加とポイント更新をアトミックに実行）';
COMMENT ON FUNCTION subtract_points_transaction IS 'ポイント減算のトランザクション処理（履歴追加とポイント更新をアトミックに実行）';
