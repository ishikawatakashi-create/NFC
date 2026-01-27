-- studentsテーブルのstatusに'disabled'（利用停止）を追加
-- 社員・アルバイトなどの利用停止状態を表現するため

-- enum型に'disabled'値を追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'disabled' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'student_status')
    ) THEN
        ALTER TYPE student_status ADD VALUE 'disabled';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- 既に存在する場合は無視
        NULL;
END $$;

-- カラムコメントを更新
COMMENT ON COLUMN students.status IS 'ステータス（active: 在籍, suspended: 休会, withdrawn: 退会, graduated: 卒業, disabled: 利用停止）';
