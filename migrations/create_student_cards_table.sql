-- 生徒とカードトークンの紐付けテーブル
-- 責務: 生徒とNFCカードトークンの関連を管理する（1生徒1枚運用）
CREATE TABLE IF NOT EXISTS student_cards (
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  card_token_id UUID NOT NULL REFERENCES card_tokens(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, card_token_id)
);

-- 1生徒に1枚のみの運用とするため、student_idにuniqueを設定
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_cards_student_id ON student_cards(student_id);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_student_cards_card_token_id ON student_cards(card_token_id);

-- コメント
COMMENT ON TABLE student_cards IS '生徒とNFCカードトークンの紐付けテーブル（1生徒1枚運用）';
COMMENT ON COLUMN student_cards.student_id IS '生徒ID（students.id）';
COMMENT ON COLUMN student_cards.card_token_id IS 'カードトークンID（card_tokens.id）';
COMMENT ON COLUMN student_cards.created_at IS '紐付け作成日時';

