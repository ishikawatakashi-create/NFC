-- studentsテーブルのstatusカラムに'graduated'（卒業）ステータスを追加
-- シンプル版：既存のCHECK制約を削除して新しい制約を追加

-- ステップ1: 既存のCHECK制約を削除（制約名が分かっている場合）
-- 制約名が不明な場合は、SupabaseのSQLエディタで以下を実行して確認してください：
-- SELECT constraint_name FROM information_schema.table_constraints 
-- WHERE table_name = 'students' AND constraint_type = 'CHECK';

-- 例：制約名が 'students_status_check' の場合
-- ALTER TABLE students DROP CONSTRAINT IF EXISTS students_status_check;

-- ステップ2: 新しいCHECK制約を追加（'active', 'suspended', 'withdrawn', 'graduated'を許可）
ALTER TABLE students 
DROP CONSTRAINT IF EXISTS students_status_check;

ALTER TABLE students 
ADD CONSTRAINT students_status_check 
CHECK (status IN ('active', 'suspended', 'withdrawn', 'graduated'));

-- コメント更新（オプション）
COMMENT ON COLUMN students.status IS 'ステータス（active: 在籍, suspended: 休会, withdrawn: 退会, graduated: 卒業）';

