-- クラス別ボーナス閾値設定テーブルにボーナスポイント数カラムを追加
ALTER TABLE class_based_bonus_thresholds 
ADD COLUMN IF NOT EXISTS bonus_points INTEGER NOT NULL DEFAULT 3 CHECK (bonus_points > 0);

-- コメント追加
COMMENT ON COLUMN class_based_bonus_thresholds.bonus_points IS 'ボーナスポイント数（同月内で閾値回数入室した際に付与されるポイント数）';






