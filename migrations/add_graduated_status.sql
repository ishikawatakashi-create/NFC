-- studentsテーブルのstatusカラムに'graduated'（卒業）ステータスを追加
-- 既存のCHECK制約を更新して、'graduated'を許可する

-- 既存のCHECK制約を削除（制約名は環境によって異なる可能性があるため、存在する制約を確認してから削除）
-- 以下のコマンドで既存の制約名を確認できます：
-- SELECT constraint_name FROM information_schema.table_constraints 
-- WHERE table_name = 'students' AND constraint_type = 'CHECK' AND constraint_name LIKE '%status%';

-- 一般的な制約名のパターンで削除を試みる（エラーが発生しても続行）
DO $$
BEGIN
    -- 制約名が不明な場合、動的に削除を試みる
    EXECUTE (
        SELECT 'ALTER TABLE students DROP CONSTRAINT IF EXISTS ' || constraint_name || ';'
        FROM information_schema.table_constraints
        WHERE table_name = 'students' 
        AND constraint_type = 'CHECK' 
        AND constraint_name LIKE '%status%'
        LIMIT 1
    );
EXCEPTION
    WHEN OTHERS THEN
        -- 制約が存在しない、または別の名前の場合は無視
        NULL;
END $$;

-- 新しいCHECK制約を追加（'active', 'suspended', 'withdrawn', 'graduated'を許可）
ALTER TABLE students 
ADD CONSTRAINT students_status_check 
CHECK (status IN ('active', 'suspended', 'withdrawn', 'graduated'));

-- コメント更新（オプション）
COMMENT ON COLUMN students.status IS 'ステータス（active: 在籍, suspended: 休会, withdrawn: 退会, graduated: 卒業）';

