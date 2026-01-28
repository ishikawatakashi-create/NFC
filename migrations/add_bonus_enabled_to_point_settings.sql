-- point_settingsテーブルにボーナスポイントのON/OFFフラグを追加
ALTER TABLE point_settings
ADD COLUMN IF NOT EXISTS bonus_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN point_settings.bonus_enabled IS 'ボーナスポイント付与を有効にするか';
