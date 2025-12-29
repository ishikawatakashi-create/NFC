# 🔐 localtunnelのパスワード問題の解決方法

## 問題

Android端末で `https://social-peaches-dream.loca.lt` にアクセスした際に、パスワードを求められる。

## 原因

localtunnelの無料版は、セキュリティ上の理由から初回アクセス時に警告ページを表示し、パブリックIPアドレスをパスワードとして入力することを要求します。

## ✅ 解決方法

### 方法1: パスワードを入力する（推奨）

1. **パブリックIPアドレスを確認**

   **PowerShellで実行:**
   ```powershell
   (Invoke-WebRequest -Uri "https://api.ipify.org").Content
   ```

   または、ブラウザで以下のURLにアクセス:
   ```
   https://api.ipify.org
   ```

2. **表示されたIPアドレスをパスワードとして入力**
   - 例: `123.45.67.89` のような形式
   - Android端末の警告ページで、このIPアドレスを入力

3. **「Continue」または「Visit Site」ボタンをクリック**

4. **一度パスワードを入力すると、しばらくは再入力不要**
   - 同じセッション内では、パスワードを再入力する必要はありません

### 方法2: ngrokを使用する（警告ページなし）

localtunnelの警告ページを回避したい場合は、ngrokを使用してください。

#### ngrokのセットアップ

1. **ngrokをダウンロード**
   - https://ngrok.com/download にアクセス
   - 「Windows」を選択してダウンロード
   - ZIPファイルを解凍

2. **プロジェクトディレクトリに移動**
   ```powershell
   cd "C:\Users\snksg\Desktop\NFCカード開発\NFC"
   ```

3. **ngrok.exeをプロジェクトフォルダに配置**
   - 解凍した `ngrok.exe` をプロジェクトフォルダにコピー

4. **ngrokを起動**
   ```powershell
   .\ngrok.exe http 3001
   ```

5. **表示されたURLを確認**
   ```
   Forwarding    https://xxxx-xxx-xxx-xxx.ngrok-free.app -> http://localhost:3001
   ```

6. **Android端末でアクセス**
   - ngrokのURLは警告ページが表示されません（初回のみ「Visit Site」ボタンをクリックする必要がある場合があります）

### 方法3: ローカルネットワーク経由（NFC非対応）

**注意**: この方法ではNFC機能は動作しません（HTTPS必須のため）

1. **開発サーバーを0.0.0.0でバインド**
   - `package.json` の `dev` スクリプトを変更:
   ```json
   "dev": "next dev -p 3001 -H 0.0.0.0"
   ```

2. **ローカルIPアドレスを確認**
   ```powershell
   ipconfig
   # IPv4アドレスを確認（例: 192.168.1.100）
   ```

3. **Android端末でアクセス**
   - 同じWi-Fiネットワークに接続
   - `http://192.168.1.100:3001/kiosk/entry`
   - **注意**: HTTPではNFC機能は動作しません

## 🎯 推奨: パスワードを入力する方法

localtunnelを使用し続ける場合、パブリックIPアドレスをパスワードとして入力するのが最も簡単です。

### クイック手順

1. **パブリックIPアドレスを確認**
   ```powershell
   (Invoke-WebRequest -Uri "https://api.ipify.org").Content
   ```

2. **Android端末で警告ページに表示されたIPアドレスを入力**

3. **「Continue」ボタンをクリック**

4. **アプリケーションにアクセス**
   - `https://social-peaches-dream.loca.lt/kiosk/entry`
   - `https://social-peaches-dream.loca.lt/admin/students`

## 📝 注意事項

- **パスワードはパブリックIPアドレス**: 通常は `xxx.xxx.xxx.xxx` の形式
- **一度入力すればOK**: 同じセッション内では再入力不要
- **IPアドレスが変わった場合**: 再度パスワードを入力する必要があります

## 🔍 トラブルシューティング

### パスワードがわからない

1. パブリックIPアドレスを確認:
   ```powershell
   (Invoke-WebRequest -Uri "https://api.ipify.org").Content
   ```

2. または、localtunnelを起動したターミナルに表示されている情報を確認

### パスワードを入力しても進めない

- IPアドレスが正しいか確認
- ネットワーク接続を確認
- ブラウザのキャッシュをクリアして再試行

### 警告ページを完全に回避したい

ngrokなどの別のツールを使用してください。


