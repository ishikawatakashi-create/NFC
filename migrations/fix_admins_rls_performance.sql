-- adminsテーブルのRLSポリシーのパフォーマンス最適化
-- auth.uid()を(select auth.uid())に置き換えて、各行での再評価を防ぐ
-- この修正により、Supabase Database Linterの警告が解消されます

-- ============================================
-- 1. adminsテーブルのポリシーを更新
-- ============================================
-- 既存のポリシーを削除（両方のポリシー名に対応）
DROP POLICY IF EXISTS "Users can view their own admin info" ON public.admins;
DROP POLICY IF EXISTS "Admins can view own admin info" ON public.admins;

-- パフォーマンス最適化されたポリシーを作成
-- (select auth.uid())により、auth.uid()は1回だけ評価され、各行で再評価されません
CREATE POLICY "Admins can view own admin info" ON public.admins
  FOR SELECT
  USING (auth_user_id = (select auth.uid()));

-- ============================================
-- 2. コメント追加
-- ============================================
COMMENT ON POLICY "Admins can view own admin info" ON public.admins IS 
  '管理者は自分の情報のみ閲覧可能。パフォーマンス最適化のため、(select auth.uid())を使用しています。';
