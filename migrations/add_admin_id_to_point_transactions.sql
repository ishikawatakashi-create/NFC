-- point_transactionsテーブルにadmin_idカラムを追加
-- 管理者による手動加算・減算操作を記録するため

ALTER TABLE point_transactions 
ADD COLUMN IF NOT EXISTS admin_id UUID;

-- 外部キー制約を追加（adminsテーブルへの参照）
ALTER TABLE point_transactions
ADD CONSTRAINT fk_point_transactions_admin_id 
FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_point_transactions_admin_id ON point_transactions(admin_id);

-- コメント追加
COMMENT ON COLUMN point_transactions.admin_id IS '操作を行った管理者のID（admin_add, admin_subtractの場合のみ記録）';
