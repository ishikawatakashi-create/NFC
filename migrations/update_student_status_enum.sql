-- studentsテーブルのstatusカラムがENUM型の場合の更新
-- 現在のENUM型の定義を確認してから実行してください

-- ステップ1: 現在のENUM型の定義を確認（実行して結果を確認）
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'student_status'::regtype ORDER BY enumsortorder;

-- ステップ2: ENUM型に不足している値を追加
-- 'suspended'が存在しない場合は追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'suspended' 
        AND enumtypid = 'student_status'::regtype
    ) THEN
        ALTER TYPE student_status ADD VALUE IF NOT EXISTS 'suspended';
    END IF;
END $$;

-- 'graduated'が存在しない場合は追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'graduated' 
        AND enumtypid = 'student_status'::regtype
    ) THEN
        ALTER TYPE student_status ADD VALUE IF NOT EXISTS 'graduated';
    END IF;
END $$;

-- 'withdrawn'が存在しない場合は追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'withdrawn' 
        AND enumtypid = 'student_status'::regtype
    ) THEN
        ALTER TYPE student_status ADD VALUE IF NOT EXISTS 'withdrawn';
    END IF;
END $$;

-- コメント更新（オプション）
COMMENT ON COLUMN students.status IS 'ステータス（active: 在籍, suspended: 休会, withdrawn: 退会, graduated: 卒業）';







