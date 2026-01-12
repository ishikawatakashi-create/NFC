-- adminsテーブルを作成
-- 管理者情報を管理するテーブル（Supabase Authと連携）

CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  employment_type TEXT NOT NULL CHECK (employment_type IN ('part_time', 'full_time')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_admins_auth_user_id ON admins(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_admins_site_id ON admins(site_id);

-- コメント追加
COMMENT ON TABLE admins IS '管理者情報テーブル（Supabase Authと連携）';
COMMENT ON COLUMN admins.auth_user_id IS 'Supabase AuthのユーザーID（auth.users.id）';
COMMENT ON COLUMN admins.site_id IS 'サイトID（マルチテナント対応）';
COMMENT ON COLUMN admins.first_name IS '名前（名）';
COMMENT ON COLUMN admins.last_name IS '苗字（姓）';
COMMENT ON COLUMN admins.employment_type IS '雇用形態（part_time: アルバイト, full_time: 正社員）';









