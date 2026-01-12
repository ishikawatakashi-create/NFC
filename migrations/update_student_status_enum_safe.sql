-- studentsテーブルのstatusカラムがENUM型の場合の更新（安全版）
-- エラーハンドリングを使用して、既存の値がある場合はスキップします

-- 現在のENUM型の定義を確認（実行前に確認推奨）
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'student_status'::regtype ORDER BY enumsortorder;

-- 'suspended'を追加（既に存在する場合はエラーを無視）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'suspended' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'student_status')
    ) THEN
        ALTER TYPE student_status ADD VALUE 'suspended';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- 既に存在する場合は無視
        NULL;
END $$;

-- 'withdrawn'を追加（既に存在する場合はエラーを無視）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'withdrawn' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'student_status')
    ) THEN
        ALTER TYPE student_status ADD VALUE 'withdrawn';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- 既に存在する場合は無視
        NULL;
END $$;

-- 'graduated'を追加（既に存在する場合はエラーを無視）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'graduated' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'student_status')
    ) THEN
        ALTER TYPE student_status ADD VALUE 'graduated';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- 既に存在する場合は無視
        NULL;
END $$;

-- コメント更新（オプション）
COMMENT ON COLUMN students.status IS 'ステータス（active: 在籍, suspended: 休会, withdrawn: 退会, graduated: 卒業）';









