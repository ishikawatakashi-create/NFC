-- studentsテーブルに最終イベント情報を追加
-- 最終イベント種別と最終イベント日時を記録

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS last_event_type TEXT NULL CHECK (last_event_type IN ('entry', 'exit', 'no_log')),
ADD COLUMN IF NOT EXISTS last_event_timestamp TIMESTAMPTZ NULL;

-- コメント追加
COMMENT ON COLUMN students.last_event_type IS '最終イベント種別（entry: 入室, exit: 退室, no_log: ログ無し）';
COMMENT ON COLUMN students.last_event_timestamp IS '最終イベント日時';

