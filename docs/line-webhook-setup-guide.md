# LINE公式アカウント Webhook設定ガイド

## 📋 概要

LINE公式アカウントにメッセージを送信した際に自動返信するには、以下の設定が必要です：

1. **LINE Developers Console**でのWebhook URL設定
2. **LINE公式アカウントマネージャー**での応答メッセージ無効化
3. **環境変数**の確認

---

## 🔧 設定手順

### ステップ1: 環境変数の確認

まず、`.env.local`ファイルに以下の環境変数が設定されているか確認してください：

```env
# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
LINE_CHANNEL_SECRET=your_channel_secret_here

# サイトID
SITE_ID=your_site_id

# ベースURL（本番環境の場合）
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
```

**確認方法:**
- `.env.local`ファイルを開いて、上記の変数が設定されているか確認
- 値が空欄や`your_xxx_here`のままになっていないか確認

**設定方法:**
- `LINE_CHANNEL_ACCESS_TOKEN`: LINE Developers Consoleで取得（後述）
- `LINE_CHANNEL_SECRET`: LINE Developers Consoleで取得（後述）
- `SITE_ID`: 既存の設定があればそのまま使用
- `NEXT_PUBLIC_BASE_URL`: 本番環境のURL（例: `https://your-app.vercel.app`）

---

### ステップ2: LINE Developers Consoleでチャネルアクセストークンを取得

1. **LINE Developers Consoleにアクセス**
   - https://developers.line.biz/console/
   - LINEアカウントでログイン

2. **プロバイダーとチャネルを選択**
   - 左側のメニューからプロバイダーを選択
   - Messaging APIチャネルを選択

3. **チャネルアクセストークン（長期）を発行**
   - 「Messaging API設定」タブを開く
   - 「チャネルアクセストークン（長期）」セクションを探す
   - 「発行」ボタンをクリック
   - 表示されたトークンをコピー
   - **重要**: このトークンは一度しか表示されません

4. **チャネルシークレットを確認**
   - 「チャネル基本設定」タブを開く
   - 「チャネルシークレット」をコピー

5. **環境変数に設定**
   - `.env.local`ファイルを開く
   - `LINE_CHANNEL_ACCESS_TOKEN`にトークンを貼り付け
   - `LINE_CHANNEL_SECRET`にシークレットを貼り付け

---

### ステップ3: Webhook URLの設定

#### 3-1. Webhook URLを決定

**本番環境の場合:**
```
https://your-domain.vercel.app/api/line/webhook
```

**開発環境（ngrok使用）の場合:**
```
https://your-ngrok-url.ngrok.io/api/line/webhook
```

**注意:**
- ngrokを使用する場合、開発サーバー（`npm run dev`）とngrokの両方を起動する必要があります
- ngrokのURLは再起動するたびに変わるため、毎回更新が必要です

#### 3-2. LINE Developers ConsoleでWebhook URLを設定

1. **LINE Developers Consoleにアクセス**
   - https://developers.line.biz/console/
   - 該当のチャネルを選択

2. **Messaging API設定タブを開く**
   - ページ上部のタブから「Messaging API設定」をクリック

3. **Webhook URLを設定**
   - 「Webhook URL」欄に、上記で決定したURLを入力
   - 例: `https://your-domain.vercel.app/api/line/webhook`

4. **Webhookの利用を有効化**
   - 「Webhook の利用」を「オン」に設定

5. **検証ボタンをクリック**
   - 「検証」ボタンをクリック
   - 「成功」と表示されればOK
   - エラーが出る場合は、以下を確認：
     - 開発サーバーが起動しているか（`npm run dev`）
     - ngrokが起動しているか（開発環境の場合）
     - URLが正しいか（`/api/line/webhook`で終わっているか）
     - サーバーがインターネットからアクセス可能か

---

### ステップ4: 応答メッセージを無効化（重要）

LINE公式アカウントマネージャーで、自動応答メッセージを無効化する必要があります。これをしないと、Webhookが動作しません。

1. **LINE公式アカウントマネージャーにアクセス**
   - https://manager.line.biz/
   - LINEアカウントでログイン

2. **該当の公式アカウントを選択**
   - 管理している公式アカウントの一覧から選択

3. **応答設定を開く**
   - 左側のメニューから「応答設定」をクリック

4. **応答メッセージを無効化**
   - 「応答メッセージ」を「オフ」に設定
   - **重要**: これを「オン」のままにすると、Webhookが動作しません

5. **Webhookを有効化**
   - 「Webhook」を「オン」に設定
   - これにより、メッセージ受信時にWebhookが呼び出されます

---

### ステップ5: 動作確認

1. **開発サーバーを起動**（まだ起動していない場合）
   ```bash
   npm run dev
   ```

2. **ngrokを起動**（開発環境の場合）
   ```bash
   ngrok http 3001
   ```
   - ngrokのURLをコピー
   - LINE Developers ConsoleのWebhook URLを更新

3. **LINEアプリでテスト**
   - LINEアプリで公式アカウントと友だちになる
   - 公式アカウントに「紐づけ」とメッセージを送信

4. **サーバーログを確認**
   - ターミナルに以下のようなログが表示されれば成功：
     ```
     [LineWebhook] Text message: 紐づけ
     [LineWebhook] Link command detected: 紐づけ
     [LineWebhook] Sent link URL to U1234567890...
     ```

5. **LINEアプリで返信を確認**
   - 公式アカウントからURLが返信されれば成功
   - 返信がない場合は、以下を確認：
     - 環境変数が正しく設定されているか
     - Webhook URLが正しいか
     - 応答メッセージが無効化されているか
     - サーバーログにエラーがないか

---

## 🐛 トラブルシューティング

### 問題1: メッセージを送信しても返信が来ない

**確認項目:**
1. ✅ 環境変数が正しく設定されているか
   - `LINE_CHANNEL_ACCESS_TOKEN`が設定されているか
   - `LINE_CHANNEL_SECRET`が設定されているか

2. ✅ Webhook URLが正しく設定されているか
   - LINE Developers Consoleで「検証」が成功しているか
   - URLが`/api/line/webhook`で終わっているか

3. ✅ 応答メッセージが無効化されているか
   - LINE公式アカウントマネージャーで「応答メッセージ」が「オフ」になっているか
   - 「Webhook」が「オン」になっているか

4. ✅ サーバーが起動しているか
   - 開発サーバー（`npm run dev`）が起動しているか
   - ngrokが起動しているか（開発環境の場合）

5. ✅ サーバーログを確認
   - ターミナルにエラーメッセージが表示されていないか
   - `[LineWebhook]`で始まるログが表示されているか

**解決方法:**
- 上記の確認項目を順番に確認
- エラーメッセージがあれば、その内容を確認
- サーバーを再起動してみる

---

### 問題2: Webhook URLの検証が失敗する

**確認項目:**
1. ✅ 開発サーバーが起動しているか
   - `npm run dev`を実行しているか
   - ポート3001で起動しているか（`package.json`の設定を確認）

2. ✅ ngrokが起動しているか（開発環境の場合）
   - `ngrok http 3001`を実行しているか
   - ngrokのURLが正しいか

3. ✅ URLが正しいか
   - `https://your-url/api/line/webhook`の形式になっているか
   - プロトコル（`https://`）が含まれているか

4. ✅ ファイアウォールやセキュリティ設定
   - サーバーがインターネットからアクセス可能か
   - ローカルホスト（`localhost`）ではなく、ngrokのURLを使用しているか

**解決方法:**
- 開発サーバーとngrokを再起動
- URLを再確認して、正しいURLを設定
- サーバーログを確認して、エラーの原因を特定

---

### 問題3: 署名検証エラーが発生する

**エラーメッセージ:**
```
署名検証に失敗しました
```

**原因:**
- `LINE_CHANNEL_SECRET`が正しく設定されていない
- 環境変数が読み込まれていない

**解決方法:**
1. `.env.local`ファイルを確認
2. `LINE_CHANNEL_SECRET`が正しく設定されているか確認
3. サーバーを再起動（環境変数の変更を反映）

---

### 問題4: チャネルアクセストークンエラーが発生する

**エラーメッセージ:**
```
LINE_CHANNEL_ACCESS_TOKEN が設定されていません
```

**原因:**
- `LINE_CHANNEL_ACCESS_TOKEN`が設定されていない
- 環境変数が読み込まれていない

**解決方法:**
1. LINE Developers Consoleでチャネルアクセストークンを再発行
2. `.env.local`ファイルに正しく設定
3. サーバーを再起動

---

## 📝 チェックリスト

設定が完了したら、以下のチェックリストで確認してください：

- [ ] `.env.local`に`LINE_CHANNEL_ACCESS_TOKEN`が設定されている
- [ ] `.env.local`に`LINE_CHANNEL_SECRET`が設定されている
- [ ] `.env.local`に`SITE_ID`が設定されている
- [ ] LINE Developers ConsoleでWebhook URLが設定されている
- [ ] LINE Developers ConsoleでWebhook URLの検証が成功している
- [ ] LINE公式アカウントマネージャーで「応答メッセージ」が「オフ」になっている
- [ ] LINE公式アカウントマネージャーで「Webhook」が「オン」になっている
- [ ] 開発サーバーが起動している
- [ ] ngrokが起動している（開発環境の場合）
- [ ] テストメッセージを送信して、返信が来ることを確認

---

## 📚 参考リンク

- [LINE Developers Console](https://developers.line.biz/console/)
- [LINE公式アカウントマネージャー](https://manager.line.biz/)
- [LINE Messaging API ドキュメント](https://developers.line.biz/ja/docs/messaging-api/)
- [Webhookの設定方法](https://developers.line.biz/ja/docs/messaging-api/channel-webhook/)

---

## 更新履歴

- 2026-01-26: 初版作成
