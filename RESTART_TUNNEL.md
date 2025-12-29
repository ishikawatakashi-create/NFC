# 🔄 トンネルの再起動手順

## 現在の状態

✅ 開発サーバー: 起動中（ポート3001）
❌ localtunnel: 503エラー（トンネルが切断されている可能性）

## 解決方法

### ステップ1: localtunnelを再起動

1. **localtunnelを起動しているターミナルを確認**
   - もし起動しているターミナルがあれば、`Ctrl + C` で停止

2. **新しいターミナル/PowerShellを開く**

3. **プロジェクトディレクトリに移動**
   ```powershell
   cd "C:\Users\snksg\Desktop\NFCカード開発\NFC"
   ```

4. **localtunnelを起動**
   ```powershell
   npm run tunnel:lt
   ```

5. **新しいURLを確認**
   - 新しいURLが表示されます（例: `https://new-name-xxx.loca.lt`）
   - **重要**: 以前のURL（`https://social-peaches-dream.loca.lt`）は使用できません
   - 新しいURLをAndroid端末で使用してください

### ステップ2: Android端末で新しいURLにアクセス

1. **新しいURLをコピー**
   - localtunnelが表示したURL（例: `https://new-name-xxx.loca.lt`）

2. **Android端末でアクセス**
   - キオスク画面: `https://new-name-xxx.loca.lt/kiosk/entry`
   - 管理画面: `https://new-name-xxx.loca.lt/admin/students`

3. **警告ページが表示された場合**
   - パスワード: `222.0.142.243` を入力
   - 「Continue」ボタンをクリック

## ⚠️ 重要な注意事項

- **URLは毎回変わる**: localtunnelを再起動すると、URLが変わります
- **古いURLは使用不可**: 以前のURL（`https://social-peaches-dream.loca.lt`）は使用できません
- **必ず新しいURLを使用**: localtunnelが表示した最新のURLを使用してください

## 🎯 より安定した方法: ngrokを使用

localtunnelが不安定な場合、ngrokを使用することをお勧めします。

### ngrokのセットアップ

1. **ngrokをダウンロード**
   - https://ngrok.com/download にアクセス
   - 「Windows」を選択してダウンロード
   - ZIPファイルを解凍

2. **ngrok.exeをプロジェクトフォルダに配置**
   - 例: `C:\Users\snksg\Desktop\NFCカード開発\NFC\ngrok.exe`

3. **開発サーバーを起動**（既に起動中）
   ```powershell
   npm run dev
   ```

4. **別のターミナルでngrokを起動**
   ```powershell
   cd "C:\Users\snksg\Desktop\NFCカード開発\NFC"
   .\ngrok.exe http 3001
   ```

5. **表示されたURLを使用**
   - ngrokはより安定しており、503エラーが発生しにくいです
   - 初回アクセス時に「Visit Site」ボタンをクリックする必要がある場合があります

## 📝 クイックリファレンス

### localtunnelを再起動

```powershell
# 1. プロジェクトディレクトリに移動
cd "C:\Users\snksg\Desktop\NFCカード開発\NFC"

# 2. localtunnelを起動
npm run tunnel:lt

# 3. 表示された新しいURLをAndroid端末で使用
```

### ngrokを使用（推奨）

```powershell
# 1. プロジェクトディレクトリに移動
cd "C:\Users\snksg\Desktop\NFCカード開発\NFC"

# 2. ngrokを起動
.\ngrok.exe http 3001

# 3. 表示されたURLをAndroid端末で使用
```


