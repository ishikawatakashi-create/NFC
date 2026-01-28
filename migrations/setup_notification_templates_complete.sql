-- ============================================
-- LINE通知テンプレート機能セットアップ（完全版）
-- ============================================
-- このスクリプトは以下を実行します：
-- 1. point_settingsテーブルの作成（存在しない場合）
-- 2. 通知テンプレートカラムの追加
-- 3. デフォルト値の設定
-- ============================================

-- ============================================
-- 1. point_settingsテーブルの作成
-- ============================================

CREATE TABLE IF NOT EXISTS point_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  entry_points INTEGER NOT NULL DEFAULT 1 CHECK (entry_points >= 0),
  daily_limit BOOLEAN NOT NULL DEFAULT true,
  bonus_enabled BOOLEAN NOT NULL DEFAULT true,
  entry_notification_template TEXT NULL,
  exit_notification_template TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(site_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_point_settings_site_id ON point_settings(site_id);

-- コメント追加
COMMENT ON TABLE point_settings IS 'ポイント設定テーブル';
COMMENT ON COLUMN point_settings.entry_points IS '入室1回あたりに付与するポイント数';
COMMENT ON COLUMN point_settings.daily_limit IS '1日1回制限（trueの場合、同じ日に複数回入室してもポイントは1回のみ付与）';
COMMENT ON COLUMN point_settings.bonus_enabled IS 'ボーナスポイント付与を有効にするか';
COMMENT ON COLUMN point_settings.entry_notification_template IS '入室通知のメッセージテンプレート（[生徒名]、[現在時刻]のタグが利用可能）';
COMMENT ON COLUMN point_settings.exit_notification_template IS '退室通知のメッセージテンプレート（[生徒名]、[現在時刻]のタグが利用可能）';

-- ============================================
-- 2. 通知テンプレートカラムの追加（既存テーブルの場合）
-- ============================================

-- テーブルが既に存在する場合に備えて、カラムを追加
ALTER TABLE point_settings 
ADD COLUMN IF NOT EXISTS entry_notification_template TEXT NULL;

ALTER TABLE point_settings 
ADD COLUMN IF NOT EXISTS exit_notification_template TEXT NULL;

ALTER TABLE point_settings 
ADD COLUMN IF NOT EXISTS bonus_enabled BOOLEAN NOT NULL DEFAULT true;

-- ============================================
-- 3. デフォルト値の設定
-- ============================================

-- 既存レコードにデフォルト値を設定
UPDATE point_settings 
SET entry_notification_template = '[生徒名]さんが入室しました。
時刻: [現在時刻]'
WHERE entry_notification_template IS NULL;

UPDATE point_settings 
SET exit_notification_template = '[生徒名]さんが退室しました。
時刻: [現在時刻]'
WHERE exit_notification_template IS NULL;

-- ============================================
-- 4. 確認用SELECT
-- ============================================

-- テーブルが正常に作成されたことを確認
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'point_settings'
ORDER BY ordinal_position;

-- 既存データの確認
SELECT * FROM point_settings;



