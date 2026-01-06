-- 親御さんとLINEアカウントの紐づけ、入退室通知機能用のテーブルを作成
-- 責務: 親御さん情報、生徒との紐づけ、LINEアカウント情報を管理

-- ============================================
-- 1. parentsテーブル（親御さん情報）
-- ============================================
CREATE TABLE IF NOT EXISTS parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone_number TEXT,
  email TEXT,
  relationship TEXT CHECK (relationship IN ('mother', 'father', 'guardian', 'other')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_parents_site_id ON parents(site_id);
CREATE INDEX IF NOT EXISTS idx_parents_email ON parents(email);

-- コメント追加
COMMENT ON TABLE parents IS '親御さん情報テーブル';
COMMENT ON COLUMN parents.site_id IS 'サイトID（マルチテナント対応）';
COMMENT ON COLUMN parents.name IS '親御さんの名前';
COMMENT ON COLUMN parents.phone_number IS '電話番号';
COMMENT ON COLUMN parents.email IS 'メールアドレス';
COMMENT ON COLUMN parents.relationship IS '続柄（mother: 母親, father: 父親, guardian: 保護者, other: その他）';
COMMENT ON COLUMN parents.notes IS '備考';

-- ============================================
-- 2. parent_studentsテーブル（親御さんと生徒の紐づけ）
-- ============================================
CREATE TABLE IF NOT EXISTS parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false, -- 主な連絡先かどうか
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_parent_students_parent_id ON parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student_id ON parent_students(student_id);

-- コメント追加
COMMENT ON TABLE parent_students IS '親御さんと生徒の紐づけテーブル（多対多）';
COMMENT ON COLUMN parent_students.parent_id IS '親御さんID（parents.id）';
COMMENT ON COLUMN parent_students.student_id IS '生徒ID（students.id）';
COMMENT ON COLUMN parent_students.is_primary IS '主な連絡先かどうか（trueの場合、通知が優先的に送信される）';

-- ============================================
-- 3. parent_line_accountsテーブル（親御さんのLINEアカウント情報）
-- ============================================
CREATE TABLE IF NOT EXISTS parent_line_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  line_user_id TEXT NOT NULL UNIQUE, -- LINE Messaging APIのユーザーID
  line_display_name TEXT, -- LINEの表示名
  is_active BOOLEAN NOT NULL DEFAULT true, -- 通知が有効かどうか
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- LINE連携開始日時
  unsubscribed_at TIMESTAMPTZ, -- LINE連携解除日時
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_parent_line_accounts_parent_id ON parent_line_accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_line_accounts_line_user_id ON parent_line_accounts(line_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_line_accounts_is_active ON parent_line_accounts(is_active);

-- コメント追加
COMMENT ON TABLE parent_line_accounts IS '親御さんのLINEアカウント情報テーブル';
COMMENT ON COLUMN parent_line_accounts.parent_id IS '親御さんID（parents.id）';
COMMENT ON COLUMN parent_line_accounts.line_user_id IS 'LINE Messaging APIのユーザーID（LINE公式アカウントと友だちになった際に取得）';
COMMENT ON COLUMN parent_line_accounts.line_display_name IS 'LINEの表示名';
COMMENT ON COLUMN parent_line_accounts.is_active IS '通知が有効かどうか（trueの場合、入退室通知が送信される）';
COMMENT ON COLUMN parent_line_accounts.subscribed_at IS 'LINE連携開始日時';
COMMENT ON COLUMN parent_line_accounts.unsubscribed_at IS 'LINE連携解除日時';

-- ============================================
-- 4. line_notification_logsテーブル（LINE通知送信履歴）
-- ============================================
CREATE TABLE IF NOT EXISTS line_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  access_log_id UUID REFERENCES access_logs(id) ON DELETE SET NULL,
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('entry', 'exit', 'forced_exit')),
  line_user_id TEXT NOT NULL,
  message_sent TEXT NOT NULL, -- 送信したメッセージ内容
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  error_message TEXT, -- エラーメッセージ（失敗時）
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_line_notification_logs_site_id ON line_notification_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_line_notification_logs_access_log_id ON line_notification_logs(access_log_id);
CREATE INDEX IF NOT EXISTS idx_line_notification_logs_parent_id ON line_notification_logs(parent_id);
CREATE INDEX IF NOT EXISTS idx_line_notification_logs_student_id ON line_notification_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_line_notification_logs_sent_at ON line_notification_logs(sent_at DESC);

-- コメント追加
COMMENT ON TABLE line_notification_logs IS 'LINE通知送信履歴テーブル';
COMMENT ON COLUMN line_notification_logs.access_log_id IS '入退室ログID（access_logs.id）';
COMMENT ON COLUMN line_notification_logs.parent_id IS '親御さんID（parents.id）';
COMMENT ON COLUMN line_notification_logs.student_id IS '生徒ID（students.id）';
COMMENT ON COLUMN line_notification_logs.event_type IS 'イベント種別（entry: 入室, exit: 退室, forced_exit: 強制退室）';
COMMENT ON COLUMN line_notification_logs.line_user_id IS 'LINEユーザーID';
COMMENT ON COLUMN line_notification_logs.message_sent IS '送信したメッセージ内容';
COMMENT ON COLUMN line_notification_logs.status IS '送信ステータス（success: 成功, failed: 失敗, pending: 送信待ち）';
COMMENT ON COLUMN line_notification_logs.error_message IS 'エラーメッセージ（失敗時）';




