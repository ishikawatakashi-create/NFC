-- ポイントシステムのテーブルを作成
-- 1. studentsテーブルにポイント関連カラムを追加
-- 2. ポイント履歴テーブルを作成
-- 3. ボーナス閾値設定テーブルを作成（属性別・クラス別）

-- ============================================
-- 1. studentsテーブルにポイント関連カラムを追加
-- ============================================
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS current_points INTEGER NOT NULL DEFAULT 0;

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS bonus_threshold INTEGER NULL;

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS has_custom_bonus_threshold BOOLEAN NOT NULL DEFAULT false;

-- コメント追加
COMMENT ON COLUMN students.current_points IS '現在のポイント数';
COMMENT ON COLUMN students.bonus_threshold IS '個別設定のボーナス閾値（NULLの場合はクラスまたは属性設定を使用）';
COMMENT ON COLUMN students.has_custom_bonus_threshold IS '個別設定があるかどうか（trueの場合、クラスや属性が変更されても個別設定が優先される）';

-- ============================================
-- 2. ポイント履歴テーブルを作成
-- ============================================
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  student_id UUID NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('entry', 'bonus', 'consumption', 'admin_add', 'admin_subtract')),
  points INTEGER NOT NULL,
  description TEXT,
  reference_id UUID, -- access_logs.idなど、関連するレコードのID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_point_transactions_site_id ON point_transactions(site_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_student_id ON point_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON point_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_transactions_transaction_type ON point_transactions(transaction_type);

-- コメント追加
COMMENT ON TABLE point_transactions IS 'ポイント履歴テーブル';
COMMENT ON COLUMN point_transactions.transaction_type IS '取引種別（entry: 入室, bonus: ボーナス, consumption: 消費, admin_add: 管理追加, admin_subtract: 管理減算）';
COMMENT ON COLUMN point_transactions.points IS 'ポイント数（正の値は獲得、負の値は消費）';
COMMENT ON COLUMN point_transactions.description IS '取引の説明';
COMMENT ON COLUMN point_transactions.reference_id IS '関連するレコードのID（例：access_logs.id）';

-- ============================================
-- 3. 属性別ボーナス閾値設定テーブルを作成
-- ============================================
CREATE TABLE IF NOT EXISTS role_based_bonus_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'part_time', 'full_time')),
  bonus_threshold INTEGER NOT NULL CHECK (bonus_threshold > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(site_id, role)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_role_based_bonus_thresholds_site_id ON role_based_bonus_thresholds(site_id);
CREATE INDEX IF NOT EXISTS idx_role_based_bonus_thresholds_role ON role_based_bonus_thresholds(role);

-- コメント追加
COMMENT ON TABLE role_based_bonus_thresholds IS '属性ごとのボーナス閾値設定テーブル';
COMMENT ON COLUMN role_based_bonus_thresholds.role IS '属性（student: 生徒, part_time: アルバイト, full_time: 正社員）';
COMMENT ON COLUMN role_based_bonus_thresholds.bonus_threshold IS 'ボーナスポイントが付与される入室回数（同月内）';

-- ============================================
-- 4. クラス別ボーナス閾値設定テーブルを作成
-- ============================================
CREATE TABLE IF NOT EXISTS class_based_bonus_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  class TEXT NOT NULL CHECK (class IN ('kindergarten', 'beginner', 'challenger', 'creator', 'innovator')),
  bonus_threshold INTEGER NOT NULL CHECK (bonus_threshold > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(site_id, class)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_class_based_bonus_thresholds_site_id ON class_based_bonus_thresholds(site_id);
CREATE INDEX IF NOT EXISTS idx_class_based_bonus_thresholds_class ON class_based_bonus_thresholds(class);

-- コメント追加
COMMENT ON TABLE class_based_bonus_thresholds IS 'クラスごとのボーナス閾値設定テーブル';
COMMENT ON COLUMN class_based_bonus_thresholds.class IS 'クラス（kindergarten, beginner, challenger, creator, innovator）';
COMMENT ON COLUMN class_based_bonus_thresholds.bonus_threshold IS 'ボーナスポイントが付与される入室回数（同月内）';






