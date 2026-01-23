-- ポイントバックアップテーブルを作成
-- 特定時点のポイント状態をスナップショットとして保存

CREATE TABLE IF NOT EXISTS point_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  backup_name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  snapshot_data JSONB NOT NULL, -- 各生徒のポイント状態をJSON形式で保存
  UNIQUE(site_id, backup_name)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_point_backups_site_id ON point_backups(site_id);
CREATE INDEX IF NOT EXISTS idx_point_backups_created_at ON point_backups(created_at DESC);

-- コメント追加
COMMENT ON TABLE point_backups IS 'ポイントバックアップテーブル';
COMMENT ON COLUMN point_backups.backup_name IS 'バックアップ名（一意）';
COMMENT ON COLUMN point_backups.description IS 'バックアップの説明';
COMMENT ON COLUMN point_backups.snapshot_data IS '各生徒のポイント状態のスナップショット（JSON形式）';
