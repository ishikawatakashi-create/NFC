-- studentsテーブルにcard_idカラムを追加
-- 既存データを壊さないため、NULL許容で追加

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS card_id TEXT NULL;

-- コメント追加（オプション）
COMMENT ON COLUMN students.card_id IS 'NFCカードID（生徒に対応するNFCカードのID）';


