-- studentsテーブルにclassカラムを追加
-- 既存データを壊さないため、NULL許容で追加

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS class TEXT NULL;

-- コメント追加（オプション）
COMMENT ON COLUMN students.class IS 'コース（kindergarten, beginner, challenger, creator, innovator）';







