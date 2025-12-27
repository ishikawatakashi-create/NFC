-- studentsテーブルのstatusカラムがENUM型の場合の更新（シンプル版）
-- PostgreSQLのENUM型に値を追加する

-- 注意: ENUM型に値を追加する際は、トランザクション内で実行する必要があります
-- また、既存の値の後に追加されます

-- 現在のENUM型の定義を確認（実行前に確認推奨）
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'student_status'::regtype ORDER BY enumsortorder;

-- ENUM型に値を追加（存在しない場合のみ追加）
-- 注意: 'IF NOT EXISTS'はPostgreSQL 9.1以降でサポートされていますが、
-- ENUM型の値追加では使用できない場合があります

-- 方法1: 直接追加（エラーが発生する場合は既に存在している）
ALTER TYPE student_status ADD VALUE IF NOT EXISTS 'suspended';
ALTER TYPE student_status ADD VALUE IF NOT EXISTS 'withdrawn';
ALTER TYPE student_status ADD VALUE IF NOT EXISTS 'graduated';

-- 方法2: エラーハンドリング付き（方法1でエラーが出る場合）
-- DO $$
-- BEGIN
--     ALTER TYPE student_status ADD VALUE 'suspended';
-- EXCEPTION
--     WHEN duplicate_object THEN NULL;
-- END $$;
-- 
-- DO $$
-- BEGIN
--     ALTER TYPE student_status ADD VALUE 'withdrawn';
-- EXCEPTION
--     WHEN duplicate_object THEN NULL;
-- END $$;
-- 
-- DO $$
-- BEGIN
--     ALTER TYPE student_status ADD VALUE 'graduated';
-- EXCEPTION
--     WHEN duplicate_object THEN NULL;
-- END $$;

-- コメント更新（オプション）
COMMENT ON COLUMN students.status IS 'ステータス（active: 在籍, suspended: 休会, withdrawn: 退会, graduated: 卒業）';

