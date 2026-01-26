# LINE Webhook設定 クイックガイド

## 🚨 現在の問題

LINE公式アカウントにメッセージを送信しても返信が来ない場合、以下の設定が不足している可能性があります。

---

## ✅ 必要な設定（3つ）

### 1. 環境変数の設定

`.env.local`ファイルに以下を追加・確認してください：

```env
# LINE Messaging API（必須）
LINE_CHANNEL_ACCESS_TOKEN=既に設定済み ✅
LINE_CHANNEL_SECRET=ここに設定が必要 ⚠️

# ベースURL（本番環境の場合）
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
```

**`LINE_CHANNEL_SECRET`の取得方法:**
1. LINE Developers Console (https://developers.line.biz/console/) にアクセス
2. プロバイダー → Messaging APIチャネルを選択
3. 「チャネル基本設定」タブを開く
4. 「チャネルシークレット」をコピー
5. `.env.local`に追加

---

### 2. LINE Developers ConsoleでWebhook URLを設定

1. **LINE Developers Consoleにアクセス**
   - https://developers.line.biz/console/
   - プロバイダー → Messaging APIチャネルを選択

2. **Messaging API設定タブを開く**
   - ページ上部のタブから「Messaging API設定」をクリック

3. **Webhook URLを設定**
   - 「Webhook URL」欄に以下を入力：
     - **本番環境**: `https://your-domain.vercel.app/api/line/webhook`
     - **開発環境（ngrok）**: `https://your-ngrok-url.ngrok.io/api/line/webhook`
   - 「Webhook の利用」を「オン」に設定
   - 「検証」ボタンをクリック → 「成功」と表示されればOK

---

### 3. LINE公式アカウントマネージャーで応答メッセージを無効化

**重要**: これをしないとWebhookが動作しません！

1. **LINE公式アカウントマネージャーにアクセス**
   - https://manager.line.biz/
   - 該当の公式アカウントを選択

2. **応答設定を開く**
   - 左側のメニューから「応答設定」をクリック

3. **設定を変更**
   - 「応答メッセージ」を「**オフ**」に設定 ⚠️ 重要
   - 「Webhook」を「**オン**」に設定

---

## 🧪 動作確認

設定が完了したら：

1. **サーバーを再起動**
   ```bash
   # 開発サーバーを停止（Ctrl+C）
   # 再度起動
   npm run dev
   ```

2. **ngrokを起動**（開発環境の場合）
   ```bash
   ngrok http 3001
   ```
   - ngrokのURLをコピー
   - LINE Developers ConsoleのWebhook URLを更新

3. **テスト**
   - LINEアプリで公式アカウントと友だちになる
   - 「紐づけ」とメッセージを送信
   - 返信が来れば成功！

---

## 🐛 まだ返信が来ない場合

### チェックリスト

- [ ] `.env.local`に`LINE_CHANNEL_SECRET`が設定されているか
- [ ] サーバーを再起動したか（環境変数の変更を反映）
- [ ] LINE Developers ConsoleでWebhook URLが正しく設定されているか
- [ ] Webhook URLの検証が成功しているか
- [ ] LINE公式アカウントマネージャーで「応答メッセージ」が「オフ」になっているか
- [ ] LINE公式アカウントマネージャーで「Webhook」が「オン」になっているか
- [ ] 開発サーバーが起動しているか
- [ ] ngrokが起動しているか（開発環境の場合）
- [ ] サーバーログ（ターミナル）にエラーが表示されていないか

### サーバーログを確認

ターミナルに以下のようなログが表示されれば成功：
```
[LineWebhook] Text message: 紐づけ
[LineWebhook] Link command detected: 紐づけ
[LineWebhook] Sent link URL to U1234567890...
```

エラーが表示される場合は、その内容を確認してください。

---

## 📚 詳細な手順

より詳しい手順が必要な場合は、以下を参照してください：
- `docs/line-webhook-setup-guide.md` - 詳細な設定手順
- `docs/line-developers-console-setup-detail.md` - LINE Developers Consoleの設定方法

---

**最終更新**: 2026-01-26
