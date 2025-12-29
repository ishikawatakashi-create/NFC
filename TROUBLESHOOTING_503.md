# 🔧 503エラー（Tunnel Unavailable）の解決方法

## 問題

Android端末で `https://social-peaches-dream.loca.lt` にアクセスした際に、`503 - Tunnel Unavailable` エラーが表示される。

## 原因

503エラーは、以下のいずれかが原因です：

1. **開発サーバーが起動していない**（ポート3001でリッスンしていない）
2. **localtunnelのプロセスが停止している**
3. **ネットワーク接続の問題**
4. **localtunnelのサービス側の問題**

## ✅ 解決方法

### ステップ1: 開発サーバーを起動

1. **プロジェクトディレクトリに移動**
   ```powershell
   cd "C:\Users\snksg\Desktop\NFCカード開発\NFC"
   ```

2. **開発サーバーを起動**
   ```powershell
   npm run dev
   ```

3. **起動を確認**
   - ターミナルに `Ready - started server on 0.0.0.0:3001` と表示されることを確認
   - ブラウザで `http://localhost:3001` にアクセスして動作確認

### ステップ2: localtunnelを再起動

1. **既存のlocaltunnelプロセスを停止**
   - localtunnelを起動しているターミナルで `Ctrl + C` を押す

2. **新しいターミナル/PowerShellを開く**

3. **プロジェクトディレクトリに移動**
   ```powershell
   cd "C:\Users\snksg\Desktop\NFCカード開発\NFC"
   ```

4. **localtunnelを再起動**
   ```powershell
   npm run tunnel:lt
   ```

5. **新しいURLを確認**
   - 新しいURLが表示されます（例: `https://new-name-xxx.loca.lt`）
   - このURLをAndroid端末で使用してください

### ステップ3: ポート3001が使用中の場合

もしポート3001が既に使用されている場合：

1. **使用中のプロセスを確認**
   ```powershell
   netstat -ano | findstr :3001
   ```

2. **プロセスを終了（必要な場合）**
   ```powershell
   # プロセスIDを確認して終了
   taskkill /PID <プロセスID> /F
   ```

3. **別のポートを使用**
   - `package.json` の `dev` スクリプトを変更:
   ```json
   "dev": "next dev -p 3002"
   ```
   - localtunnelも同じポートを指定:
   ```powershell
   npx localtunnel --port 3002
   ```

## 🔄 完全な再起動手順

### 方法1: 順番に起動

1. **ターミナル1: 開発サーバー**
   ```powershell
   cd "C:\Users\snksg\Desktop\NFCカード開発\NFC"
   npm run dev
   ```

2. **ターミナル2: localtunnel**
   ```powershell
   cd "C:\Users\snksg\Desktop\NFCカード開発\NFC"
   npm run tunnel:lt
   ```

3. **確認**
   - 開発サーバーが `http://localhost:3001` で起動していることを確認
   - localtunnelが新しいURLを表示していることを確認
   - Android端末で新しいURLにアクセス

### 方法2: 一度すべてを停止して再起動

1. **すべてのプロセスを停止**
   - すべてのターミナルで `Ctrl + C` を押す

2. **数秒待つ**

3. **開発サーバーを起動**
   ```powershell
   cd "C:\Users\snksg\Desktop\NFCカード開発\NFC"
   npm run dev
   ```

4. **別のターミナルでlocaltunnelを起動**
   ```powershell
   cd "C:\Users\snksg\Desktop\NFCカード開発\NFC"
   npm run tunnel:lt
   ```

## 🎯 推奨: ngrokを使用（より安定）

localtunnelが不安定な場合、ngrokを使用することをお勧めします。

### ngrokのセットアップ

1. **ngrokをダウンロード**
   - https://ngrok.com/download にアクセス
   - 「Windows」を選択してダウンロード
   - ZIPファイルを解凍

2. **ngrok.exeをプロジェクトフォルダに配置**

3. **開発サーバーを起動**
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

## 📝 チェックリスト

- [ ] 開発サーバーが起動している（`http://localhost:3001` にアクセスできる）
- [ ] localtunnelが起動している（新しいURLが表示されている）
- [ ] 両方のプロセスが実行中である
- [ ] ポート3001が使用可能である
- [ ] ネットワーク接続が正常である

## 🔍 トラブルシューティング

### 開発サーバーが起動しない

```powershell
# エラーメッセージを確認
npm run dev

# ポートが使用中の場合
netstat -ano | findstr :3001
```

### localtunnelが起動しない

```powershell
# 直接実行してエラーメッセージを確認
npx localtunnel --port 3001

# 別のポートを試す
npx localtunnel --port 3002
```

### 503エラーが続く

1. **すべてのプロセスを停止**
2. **数秒待つ**
3. **開発サーバーを先に起動**
4. **開発サーバーが完全に起動したことを確認**
5. **localtunnelを起動**

### それでも解決しない場合

ngrokなどの別のツールを使用することをお勧めします。


