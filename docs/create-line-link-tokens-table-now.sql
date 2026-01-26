-- ============================================
-- line_link_tokens テーブル作成SQL
-- ============================================
-- LINEアカウントとNFCカードの紐づけ用一時トークンテーブル
-- 責務: 親御さんが自分でLINEアカウントと子どものNFCカードを紐づける際の一時トークンを管理

-- テーブル作成
CREATE TABLE IF NOT EXISTS line_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  line_user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_line_link_tokens_site_id ON line_link_tokens(site_id);
CREATE INDEX IF NOT EXISTS idx_line_link_tokens_token ON line_link_tokens(token);
CREATE INDEX IF NOT EXISTS idx_line_link_tokens_line_user_id ON line_link_tokens(line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_link_tokens_is_used ON line_link_tokens(is_used);
CREATE INDEX IF NOT EXISTS idx_line_link_tokens_expires_at ON line_link_tokens(expires_at);

-- コメント追加
COMMENT ON TABLE line_link_tokens IS 'LINEアカウントとNFCカードの紐づけ用一時トークンテーブル';
COMMENT ON COLUMN line_link_tokens.site_id IS 'サイトID（マルチテナント対応）';
COMMENT ON COLUMN line_link_tokens.line_user_id IS 'LINEユーザーID';
COMMENT ON COLUMN line_link_tokens.token IS '一時トークン（URLに含める）';
COMMENT ON COLUMN line_link_tokens.expires_at IS 'トークンの有効期限';
COMMENT ON COLUMN line_link_tokens.is_used IS 'トークンが使用済みかどうか';
COMMENT ON COLUMN line_link_tokens.used_at IS 'トークン使用日時';

-- 確認用クエリ（実行後、エラーが出なければ成功）
SELECT * FROM line_link_tokens LIMIT 1;
