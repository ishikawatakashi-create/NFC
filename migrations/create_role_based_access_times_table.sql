-- role_based_access_timesテーブルを作成
-- 属性ごとの開放時間設定を管理するテーブル

CREATE TABLE IF NOT EXISTS role_based_access_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'part_time', 'full_time')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(site_id, role)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_role_based_access_times_site_id ON role_based_access_times(site_id);
CREATE INDEX IF NOT EXISTS idx_role_based_access_times_role ON role_based_access_times(role);

-- コメント追加
COMMENT ON TABLE role_based_access_times IS '属性ごとの開放時間設定テーブル';
COMMENT ON COLUMN role_based_access_times.role IS '属性（student: 生徒, part_time: アルバイト, full_time: 正社員）';
COMMENT ON COLUMN role_based_access_times.start_time IS '開始時刻';
COMMENT ON COLUMN role_based_access_times.end_time IS '終了時刻';





