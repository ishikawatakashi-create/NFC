-- LINE友だち一覧テーブル
-- 責務: LINE公式アカウントに友だち追加されたユーザーの情報を管理

CREATE TABLE IF NOT EXISTS line_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  line_user_id TEXT NOT NULL,
  line_display_name TEXT,
  picture_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  followed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unfollowed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(site_id, line_user_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_line_followers_site_id ON line_followers(site_id);
CREATE INDEX IF NOT EXISTS idx_line_followers_line_user_id ON line_followers(line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_followers_is_active ON line_followers(is_active);
CREATE INDEX IF NOT EXISTS idx_line_followers_followed_at ON line_followers(followed_at DESC);

-- コメント追加
COMMENT ON TABLE line_followers IS 'LINE公式アカウントの友だち一覧テーブル';
COMMENT ON COLUMN line_followers.site_id IS 'サイトID（マルチテナント対応）';
COMMENT ON COLUMN line_followers.line_user_id IS 'LINE Messaging APIのユーザーID';
COMMENT ON COLUMN line_followers.line_display_name IS 'LINEの表示名';
COMMENT ON COLUMN line_followers.picture_url IS 'LINEのプロフィール画像URL';
COMMENT ON COLUMN line_followers.is_active IS '友だち状態かどうか（trueの場合、現在友だち）';
COMMENT ON COLUMN line_followers.followed_at IS '友だち追加日時';
COMMENT ON COLUMN line_followers.unfollowed_at IS '友だち解除日時';



