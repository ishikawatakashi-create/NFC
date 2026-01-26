# LINE Webhook デバッグチェックリスト

## 🔍 「紐づけ」メッセージで返信が来ない場合の確認項目

### 1. サーバーログを確認

開発サーバーのターミナルで、以下のログが表示されているか確認してください：

#### ✅ 正常な場合のログ

```
[LineWebhook] Message event received: lineUserId=U1234..., type=text
[LineWebhook] Text message received: "紐づけ"
[LineWebhook] Message type: text
[LineWebhook] Reply token: abc123...
[LineWebhook] Normalized message: "紐づけ"
[LineWebhook] Checking against commands: ["紐づけ", "紐付け", "登録", "設定", "カード登録", "通知登録"]
[LineWebhook] Is link command: true
[LineWebhook] Link command detected: 紐づけ
[LineWebhook] Token created successfully: abc123...
[LineWebhook] Generated link URL: https://...
[LineWebhook] Sending reply message...
[LineWebhook] Reply API response status: 200
[LineWebhook] Successfully sent link URL to U1234...
```

#### ❌ エラーが表示されている場合

エラーメッセージの内容を確認してください。

---

### 2. よくある問題と解決方法

#### 問題1: ログが全く表示されない

**原因:**
- Webhook URLが正しく設定されていない
- サーバーが起動していない
- ngrokが起動していない（開発環境の場合）

**解決方法:**
1. 開発サーバーが起動しているか確認（`npm run dev`）
2. ngrokが起動しているか確認（開発環境の場合）
3. LINE Developers ConsoleでWebhook URLの検証が成功しているか確認

---

#### 問題2: 「Text message received」は表示されるが「Link command detected」が表示されない

**原因:**
- メッセージのマッチングがうまくいっていない
- 全角・半角の違い
- 前後に空白がある

**確認方法:**
サーバーログで以下を確認：
```
[LineWebhook] Normalized message: "紐づけ"
[LineWebhook] Is link command: false  ← これがfalseになっている
```

**解決方法:**
- メッセージを正確に「紐づけ」と送信（コピー&ペースト推奨）
- または「登録」「設定」など他のコマンドを試す

---

#### 問題3: 「Link command detected」は表示されるが「Token created successfully」が表示されない

**原因:**
- `line_link_tokens`テーブルが存在しない
- データベース接続エラー

**解決方法:**
1. Supabase SQL Editorで`line_link_tokens`テーブルが存在するか確認
2. テーブルが存在しない場合は作成（`migrations/create_line_link_tokens_table.sql`を実行）

---

#### 問題4: 「Token created successfully」は表示されるが「Successfully sent link URL」が表示されない

**原因:**
- LINE Messaging APIへの返信が失敗している
- `LINE_CHANNEL_ACCESS_TOKEN`が無効
- `replyToken`が期限切れ

**確認方法:**
サーバーログで以下を確認：
```
[LineWebhook] Reply API response status: 400  ← エラーステータス
[LineWebhook] Error details: {...}  ← エラー詳細
```

**解決方法:**
1. `LINE_CHANNEL_ACCESS_TOKEN`が正しく設定されているか確認
2. LINE Developers Consoleでトークンを再発行
3. サーバーを再起動して環境変数を反映

---

#### 問題5: 「Successfully sent link URL」は表示されるが返信が来ない

**原因:**
- LINE公式アカウントマネージャーで「応答メッセージ」が「オン」になっている
- Webhookと応答メッセージが競合している

**解決方法:**
1. LINE公式アカウントマネージャー (https://manager.line.biz/) にアクセス
2. 「応答設定」→「応答メッセージ」を「**オフ**」に設定
3. 「Webhook」を「**オン**」に設定

---

### 3. 環境変数の確認

`.env.local`ファイルに以下が設定されているか確認：

```env
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...
SITE_ID=...
NEXT_PUBLIC_BASE_URL=...  # 本番環境の場合
```

**確認方法:**
サーバーログで以下が表示されていないか確認：
```
[LineWebhook] LINE_CHANNEL_ACCESS_TOKEN is not set
[LineWebhook] SITE_ID が設定されていません
```

---

### 4. デバッグ用のテスト

以下のコマンドで、Webhookエンドポイントが正しく動作しているか確認できます：

```bash
# Webhookエンドポイントに直接リクエストを送信（テスト用）
curl -X POST http://localhost:3001/api/line/webhook \
  -H "Content-Type: application/json" \
  -H "x-line-signature: test" \
  -d '{"events":[]}'
```

（実際のテストには、LINEプラットフォームからのリクエストが必要です）

---

## 📝 チェックリスト

- [ ] 開発サーバーが起動している
- [ ] ngrokが起動している（開発環境の場合）
- [ ] LINE Developers ConsoleでWebhook URLが設定されている
- [ ] Webhook URLの検証が成功している
- [ ] LINE公式アカウントマネージャーで「応答メッセージ」が「オフ」になっている
- [ ] LINE公式アカウントマネージャーで「Webhook」が「オン」になっている
- [ ] `.env.local`に必要な環境変数が設定されている
- [ ] `line_link_tokens`テーブルが存在する
- [ ] サーバーログにエラーが表示されていない
- [ ] 「紐づけ」メッセージを送信した際に、サーバーログに`[LineWebhook]`で始まるログが表示される

---

## 🔧 次のステップ

1. **サーバーログを確認**
   - 上記のログが表示されているか確認
   - エラーメッセージがあれば、その内容を確認

2. **エラーメッセージを共有**
   - サーバーログに表示されているエラーメッセージを共有してください
   - 特に`[LineWebhook]`で始まるログを確認

3. **環境変数の確認**
   - `.env.local`ファイルの内容を確認（機密情報は除く）
   - 必要な環境変数が設定されているか確認

---

**最終更新**: 2026-01-26
