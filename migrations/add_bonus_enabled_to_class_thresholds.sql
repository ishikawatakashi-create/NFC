-- class_based_bonus_thresholdsテーブルにボーナスポイントON/OFFフラグを追加
ALTER TABLE class_based_bonus_thresholds
ADD COLUMN IF NOT EXISTS bonus_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN class_based_bonus_thresholds.bonus_enabled IS 'ボーナスポイント付与を有効にするか';
