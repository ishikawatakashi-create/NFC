-- point_settingsテーブルに通知テンプレートカラムを追加
-- 入退室時のLINE通知メッセージテンプレートを管理

ALTER TABLE point_settings 
ADD COLUMN IF NOT EXISTS entry_notification_template TEXT NULL;

ALTER TABLE point_settings 
ADD COLUMN IF NOT EXISTS exit_notification_template TEXT NULL;

-- デフォルト値を設定
UPDATE point_settings 
SET entry_notification_template = '[生徒名]さんが入室しました。
時刻: [現在時刻]'
WHERE entry_notification_template IS NULL;

UPDATE point_settings 
SET exit_notification_template = '[生徒名]さんが退室しました。
時刻: [現在時刻]'
WHERE exit_notification_template IS NULL;

-- コメント追加
COMMENT ON COLUMN point_settings.entry_notification_template IS '入室通知のメッセージテンプレート（[生徒名]、[現在時刻]のタグが利用可能）';
COMMENT ON COLUMN point_settings.exit_notification_template IS '退室通知のメッセージテンプレート（[生徒名]、[現在時刻]のタグが利用可能）';

