-- access_logsテーブルを作成
-- 入退室ログを記録するテーブル

CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  student_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('entry', 'exit', 'no_log')),
  card_id TEXT,
  device_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notification_status TEXT NOT NULL DEFAULT 'not_required' CHECK (notification_status IN ('sent', 'not_required')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_access_logs_site_id ON access_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_student_id ON access_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON access_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_card_id ON access_logs(card_id);

-- コメント追加
COMMENT ON TABLE access_logs IS '入退室ログテーブル（イベントがあったものを記録）';
COMMENT ON COLUMN access_logs.event_type IS 'イベント種別（entry: 入室, exit: 退室, no_log: ログ無し）';
COMMENT ON COLUMN access_logs.card_id IS 'NFCカードID';
COMMENT ON COLUMN access_logs.device_id IS '端末ID（カードのIDを割り振る）';
COMMENT ON COLUMN access_logs.notification_status IS '通知ステータス（sent: 送信済み, not_required: 通知不要）';

