# LINE紐づけ用QRコード生成 トラブルシューティング

## 🚨 「紐づけ用QRコードを生成」ボタンを押しても何も表示されない

### 原因1: 環境変数が設定されていない

**症状:**
- ボタンをクリックしても何も表示されない
- エラーメッセージが表示されない

**解決方法:**

1. **`.env.local`ファイルに環境変数を追加**

```env
# LINE公式アカウントのURL（紐づけ用QRコード生成に使用）
NEXT_PUBLIC_LINE_OFFICIAL_ACCOUNT_URL=https://line.me/R/ti/p/@your-official-account-id
```

2. **LINE公式アカウントのURLを取得**

   - **方法1: LINE Developers Consoleから取得**
     1. LINE Developers Console (https://developers.line.biz/console/) にアクセス
     2. プロバイダー → Messaging APIチャネルを選択
     3. 「チャネル基本設定」タブを開く
     4. 「公式アカウント」欄にURLが表示されている場合、それをコピー

   - **方法2: LINE公式アカウントマネージャーから取得**
     1. LINE公式アカウントマネージャー (https://manager.line.biz/) にアクセス
     2. 該当のアカウントを選択
     3. 「設定」→「基本情報」を開く
     4. URLをコピー

   - **方法3: LINE公式アカウントのQRコードから確認**
     - LINE公式アカウントのQRコードを読み取ると、URLが表示されます

3. **開発サーバーを再起動**

   Next.jsでは、環境変数の変更を反映するためにサーバーの再起動が必要です：

   ```powershell
   # 開発サーバーを停止（Ctrl+C）
   # 再度起動
   npm run dev
   ```

4. **Vercelの場合**

   - Vercelダッシュボード → プロジェクト → Settings → Environment Variables
   - `NEXT_PUBLIC_LINE_OFFICIAL_ACCOUNT_URL` を追加
   - 再デプロイ（自動的に再デプロイされる場合もあります）

---

### 原因2: ブラウザのコンソールにエラーが表示されている

**確認方法:**

1. ブラウザの開発者ツールを開く（F12キー）
2. 「Console」タブを開く
3. 「紐づけ用QRコードを生成」ボタンをクリック
4. エラーメッセージを確認

**よくあるエラー:**

#### エラー1: `qrcode`パッケージが見つからない

```
Error: Cannot find module 'qrcode'
```

**解決方法:**
```powershell
npm install qrcode @types/qrcode
```

#### エラー2: 環境変数が`undefined`

```
[LinkQRCode] LINE Official Account URL: not set
```

**解決方法:**
- `.env.local`に`NEXT_PUBLIC_LINE_OFFICIAL_ACCOUNT_URL`を追加
- 開発サーバーを再起動

---

### 原因3: ダイアログが表示されない

**確認方法:**

1. ブラウザのコンソールで以下を確認：
   ```
   [LinkQRCode] Starting QR code generation for student: ...
   [LinkQRCode] LINE Official Account URL: ...
   [LinkQRCode] Generating QR code for URL: ...
   [LinkQRCode] QR code generated successfully
   [LinkQRCode] Dialog opened
   ```

2. ログが表示されない場合、ボタンのクリックイベントが発火していない可能性があります

**解決方法:**
- ページをリロード
- ブラウザのキャッシュをクリア

---

## 🔍 デバッグ手順

### ステップ1: ブラウザのコンソールを確認

1. ブラウザの開発者ツールを開く（F12）
2. 「Console」タブを開く
3. 「紐づけ用QRコードを生成」ボタンをクリック
4. `[LinkQRCode]`で始まるログを確認

### ステップ2: 環境変数の確認

ブラウザのコンソールで以下を実行：

```javascript
console.log("LINE Official Account URL:", process.env.NEXT_PUBLIC_LINE_OFFICIAL_ACCOUNT_URL)
```

`undefined`が表示される場合、環境変数が設定されていません。

### ステップ3: 開発サーバーの再起動

環境変数を追加・変更した後は、必ず開発サーバーを再起動してください：

```powershell
# 開発サーバーを停止（Ctrl+C）
# 再度起動
npm run dev
```

---

## ✅ 正常な動作

正常に動作している場合、ブラウザのコンソールに以下のようなログが表示されます：

```
[LinkQRCode] Starting QR code generation for student: abc123...
[LinkQRCode] LINE Official Account URL: https://line.me/R/ti/p/@your-account
[LinkQRCode] Generating QR code for URL: https://line.me/R/ti/p/@your-account
[LinkQRCode] QRCode module loaded
[LinkQRCode] QR code generated successfully, dataUrl length: 12345
[LinkQRCode] Dialog opened
[LinkQRCode] Finished
```

そして、QRコードが表示されるダイアログが開きます。

---

## 📝 チェックリスト

- [ ] `.env.local`に`NEXT_PUBLIC_LINE_OFFICIAL_ACCOUNT_URL`が設定されている
- [ ] 環境変数の値が正しい（`https://line.me/R/ti/p/@...`の形式）
- [ ] 開発サーバーを再起動した
- [ ] ブラウザのコンソールにエラーが表示されていない
- [ ] `qrcode`パッケージがインストールされている（`npm install qrcode @types/qrcode`）

---

## 📚 関連ドキュメント

- `docs/line-link-qr-code-guide.md` - QRコード生成機能の詳細ガイド
- `docs/line-webhook-setup-guide.md` - Webhook設定ガイド

---

**最終更新**: 2026-01-26
