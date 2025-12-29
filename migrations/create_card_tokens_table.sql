-- カードトークン管理テーブル
-- 責務: NFCカードに書き込むトークンを発行・管理する
CREATE TABLE IF NOT EXISTS card_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  disabled_at TIMESTAMPTZ NULL,
  note TEXT NULL
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_card_tokens_site_id ON card_tokens(site_id);
CREATE INDEX IF NOT EXISTS idx_card_tokens_token ON card_tokens(token);
CREATE INDEX IF NOT EXISTS idx_card_tokens_is_active ON card_tokens(is_active);

-- コメント
COMMENT ON TABLE card_tokens IS 'NFCカードに書き込むトークンを管理するテーブル';
COMMENT ON COLUMN card_tokens.site_id IS '施設ID（sites.id）';
COMMENT ON COLUMN card_tokens.token IS 'NDEF書き込み用トークン（例: iru:card:xxxxx）';
COMMENT ON COLUMN card_tokens.is_active IS 'トークンが有効かどうか';
COMMENT ON COLUMN card_tokens.issued_at IS 'トークン発行日時';
COMMENT ON COLUMN card_tokens.disabled_at IS 'トークン無効化日時';
COMMENT ON COLUMN card_tokens.note IS '備考（任意）';





