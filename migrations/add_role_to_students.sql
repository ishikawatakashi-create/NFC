-- studentsテーブルにroleカラム（属性）を追加
-- 既存データを壊さないため、NULL許容で追加（デフォルトは'student'）

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS role TEXT NULL CHECK (role IN ('student', 'part_time', 'full_time'));

-- 既存データのroleを'student'に設定
UPDATE students 
SET role = 'student' 
WHERE role IS NULL;

-- デフォルト値を設定（新規データ用）
ALTER TABLE students 
ALTER COLUMN role SET DEFAULT 'student';

-- コメント追加
COMMENT ON COLUMN students.role IS '属性（student: 生徒, part_time: アルバイト, full_time: 正社員）';

