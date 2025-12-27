-- studentsテーブルに個別開放時間設定用のカラムを追加
-- 既存データを壊さないため、NULL許容で追加

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS access_start_time TIME NULL;

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS access_end_time TIME NULL;

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS has_custom_access_time BOOLEAN NOT NULL DEFAULT false;

-- コメント追加
COMMENT ON COLUMN students.access_start_time IS '個別設定の開始時刻（NULLの場合は属性に紐づいた設定を使用）';
COMMENT ON COLUMN students.access_end_time IS '個別設定の終了時刻（NULLの場合は属性に紐づいた設定を使用）';
COMMENT ON COLUMN students.has_custom_access_time IS '個別設定があるかどうか（trueの場合、属性が変更されても個別設定が優先される）';

