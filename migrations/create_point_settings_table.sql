-- ポイント設定テーブルを作成
-- 入室時のポイント付与量などの設定を管理

CREATE TABLE IF NOT EXISTS point_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  entry_points INTEGER NOT NULL DEFAULT 1 CHECK (entry_points >= 0),
  daily_limit BOOLEAN NOT NULL DEFAULT true,
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




