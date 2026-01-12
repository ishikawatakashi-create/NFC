-- access_logsテーブルにポイント付与フラグと強制退室種別を追加
-- 1. points_awardedカラムを追加（ポイントが付与された入室かどうか）
-- 2. event_typeに'forced_exit'（強制退室）を追加

-- ============================================
-- 1. points_awardedカラムを追加
-- ============================================
ALTER TABLE access_logs 
ADD COLUMN IF NOT EXISTS points_awarded BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN access_logs.points_awarded IS 'ポイントが付与された入室かどうか（trueの場合、この入室でポイントが付与された）';

-- ============================================
-- 2. event_typeのCHECK制約を更新（forced_exitを追加）
-- ============================================
-- 既存のCHECK制約を削除
ALTER TABLE access_logs 
DROP CONSTRAINT IF EXISTS access_logs_event_type_check;

-- 新しいCHECK制約を追加（forced_exitを含む）
ALTER TABLE access_logs 
ADD CONSTRAINT access_logs_event_type_check 
CHECK (event_type IN ('entry', 'exit', 'no_log', 'forced_exit'));

-- コメントを更新
COMMENT ON COLUMN access_logs.event_type IS 'イベント種別（entry: 入室, exit: 退室, no_log: ログ無し, forced_exit: 強制退室）';






