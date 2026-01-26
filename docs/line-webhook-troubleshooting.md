# LINE Webhook 500エラー トラブルシューティング

## 🚨 エラーメッセージ

```
ボットサーバーから200以外のHTTPステータスコードが返されました。(500 Internal Server Error)
```

## 🔍 原因の確認方法

### 1. サーバーログを確認

開発サーバーのターミナルで、以下のようなエラーログを確認してください：

```
[LineWebhook] Error: ...
```

### 2. よくある原因

#### 原因1: `line_link_tokens`テーブルが存在しない

**エラーログ:**
```
[LineWebhook] Failed to create link token: relation "line_link_tokens" does not exist
```

**解決方法:**
1. Supabase SQL Editorにアクセス
2. `migrations/create_line_link_tokens_table.sql`の内容を実行

#### 原因2: 環境変数が不足している

**エラーログ:**
```
[LineWebhook] LINE_CHANNEL_SECRET が設定されていません
[LineWebhook] SITE_ID が設定されていません
```

**解決方法:**
`.env.local`ファイルに以下を確認：
- `LINE_CHANNEL_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `SITE_ID`

#### 原因3: データベース接続エラー

**エラーログ:**
```
[LineWebhook] Error: ...
```

**解決方法:**
- Supabaseの接続設定を確認
- `SUPABASE_SERVICE_ROLE_KEY`が正しく設定されているか確認

---

## ✅ 修正内容

エラーハンドリングを改善しました：

1. **必ず200を返す**: LINE Webhookは必ず200を返す必要があるため、エラーが発生しても200を返すように変更
2. **詳細なログ**: エラーが発生した場合、詳細なログを出力
3. **個別エラーハンドリング**: 各イベント処理を個別にtry-catchで囲み、エラーが発生しても他のイベントの処理を続行

---

## 🧪 動作確認

1. **サーバーを再起動**
   ```bash
   npm run dev
   ```

2. **LINEアプリでテスト**
   - LINE公式アカウントに「紐づけ」とメッセージを送信

3. **サーバーログを確認**
   - エラーが表示されていないか確認
   - `[LineWebhook]`で始まるログを確認

4. **LINE Developers Consoleで確認**
   - Webhook URLの検証が成功しているか確認
   - エラーログがないか確認

---

## 📝 チェックリスト

- [ ] `line_link_tokens`テーブルが存在する（Supabase SQL Editorで確認）
- [ ] `.env.local`に`LINE_CHANNEL_SECRET`が設定されている
- [ ] `.env.local`に`LINE_CHANNEL_ACCESS_TOKEN`が設定されている
- [ ] `.env.local`に`SITE_ID`が設定されている
- [ ] サーバーを再起動した
- [ ] サーバーログにエラーが表示されていない

---

## 🔧 データベーステーブルの確認

Supabase SQL Editorで以下を実行して、テーブルが存在するか確認：

```sql
-- line_link_tokensテーブルの確認
SELECT * FROM line_link_tokens LIMIT 1;
```

テーブルが存在しない場合は、以下を実行：

```sql
-- migrations/create_line_link_tokens_table.sql の内容を実行
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

CREATE INDEX IF NOT EXISTS idx_line_link_tokens_site_id ON line_link_tokens(site_id);
CREATE INDEX IF NOT EXISTS idx_line_link_tokens_token ON line_link_tokens(token);
CREATE INDEX IF NOT EXISTS idx_line_link_tokens_line_user_id ON line_link_tokens(line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_link_tokens_is_used ON line_link_tokens(is_used);
CREATE INDEX IF NOT EXISTS idx_line_link_tokens_expires_at ON line_link_tokens(expires_at);
```

---

## 📚 参考

- `docs/line-webhook-setup-guide.md` - Webhook設定の詳細
- `docs/line-webhook-quick-setup.md` - クイックセットアップガイド

---

**最終更新**: 2026-01-26
