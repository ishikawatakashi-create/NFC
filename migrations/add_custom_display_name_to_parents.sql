-- parentsテーブルにcustom_display_name（任意の表示名）カラムを追加
-- 責務: 管理側で設定できる任意の表示名を保存する

ALTER TABLE parents
ADD COLUMN IF NOT EXISTS custom_display_name TEXT;

-- コメントを追加
COMMENT ON COLUMN parents.custom_display_name IS '任意の表示名（管理用ニックネーム）';
