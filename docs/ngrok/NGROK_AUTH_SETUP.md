# 🔐 ngrok認証設定ガイド

## 問題

ngrokを使用するには、アカウント登録とauthtokenの設定が必要です。

## ✅ 解決方法

### ステップ1: ngrokアカウントを作成

1. **ngrokのダッシュボードにアクセス**
   - https://dashboard.ngrok.com/signup にアクセス

2. **アカウントを作成**
   - メールアドレスでサインアップ
   - または、GitHub/Googleアカウントでサインアップ

3. **メール認証を完了**
   - 登録したメールアドレスに認証メールが届きます
   - メール内のリンクをクリックして認証を完了

### ステップ2: authtokenを取得

1. **ダッシュボードにログイン**
   - https://dashboard.ngrok.com にログイン

2. **authtokenを取得**
   - 左側のメニューから「Your Authtoken」をクリック
   - または、直接 https://dashboard.ngrok.com/get-started/your-authtoken にアクセス

3. **authtokenをコピー**
   - 表示されたauthtokenをコピー
   - 例: `2abc123def456ghi789jkl012mno345pqr678stu901vwx234yz_5A6B7C8D9E0F1G2H3I4J5K`

### ステップ3: authtokenを設定

**PowerShellで実行:**

```powershell
# authtokenを設定（<YOUR_AUTHTOKEN>を実際のauthtokenに置き換える）
ngrok config add-authtoken <YOUR_AUTHTOKEN>
```

**例:**
```powershell
ngrok config add-authtoken 2abc123def456ghi789jkl012mno345pqr678stu901vwx234yz_5A6B7C8D9E0F1G2H3I4J5K
```

### ステップ4: 設定を確認

```powershell
# ngrokの設定を確認
ngrok config check
```

正常に設定されていれば、以下のようなメッセージが表示されます:
```
Authtoken saved to configuration file.
```

### ステップ5: ngrokでトンネルを作成

```powershell
# プロジェクトディレクトリに移動
cd "C:\Users\snksg\Desktop\NFCカード開発\NFC"

# ngrokでトンネルを作成
npm run tunnel:ngrok
```

または直接実行:

```powershell
ngrok http 3001
```

## 📝 クイックリファレンス

### 1. アカウント作成
- https://dashboard.ngrok.com/signup

### 2. authtoken取得
- https://dashboard.ngrok.com/get-started/your-authtoken

### 3. authtoken設定
```powershell
ngrok config add-authtoken <YOUR_AUTHTOKEN>
```

### 4. トンネル作成
```powershell
cd "C:\Users\snksg\Desktop\NFCカード開発\NFC"
ngrok http 3001
```

## 🎯 ngrokの無料プランの制限

- ✅ 1つの同時トンネル
- ✅ ランダムなURL（毎回変わる）
- ✅ セッション時間制限なし
- ⚠️ 固定URLは有料プランのみ

## 🔍 トラブルシューティング

### authtokenが設定できない

```powershell
# 設定ファイルの場所を確認
ngrok config check

# 手動で設定ファイルを編集（必要に応じて）
# 設定ファイルの場所: %USERPROFILE%\.ngrok2\ngrok.yml
```

### 認証エラーが続く

1. **authtokenが正しいか確認**
   - ダッシュボードで最新のauthtokenを確認
   - コピー&ペーストで確実に設定

2. **ngrokを再起動**
   - 設定後、ngrokを再起動

3. **バージョンを確認**
   ```powershell
   ngrok version
   ```

## 📚 参考リンク

- ngrokダッシュボード: https://dashboard.ngrok.com
- アカウント作成: https://dashboard.ngrok.com/signup
- authtoken取得: https://dashboard.ngrok.com/get-started/your-authtoken
- エラー解決: https://ngrok.com/docs/errors/err_ngrok_4018

## 🎉 設定完了後

authtokenを設定したら、以下のコマンドでトンネルを作成できます:

```powershell
cd "C:\Users\snksg\Desktop\NFCカード開発\NFC"
ngrok http 3001
```

表示されたURLをAndroid端末で使用してください！






