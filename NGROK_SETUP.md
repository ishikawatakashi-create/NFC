# 🚀 ngrokセットアップ完了 - 次のステップ

## ✅ 確認済み

- ngrok バージョン 3.24.0 がインストールされています
- 開発サーバーはポート3001で起動中です

## 📋 次のステップ

### ステップ1: ngrokでトンネルを作成

**新しいターミナル/PowerShellを開いて:**

```powershell
# プロジェクトディレクトリに移動（既にいる場合は不要）
cd "C:\Users\snksg\Desktop\NFCカード開発\NFC"

# ngrokでトンネルを作成
npm run tunnel:ngrok
```

または直接実行:

```powershell
ngrok http 3001
```

### ステップ2: ngrokのURLを確認

ngrokを起動すると、以下のような出力が表示されます:

```
Session Status                online
Account                       (Plan: Free)
Version                       3.24.0
Region                        Japan (jp)
Latency                       50ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://xxxx-xxx-xxx-xxx.ngrok-free.app -> http://localhost:3001

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**重要**: `https://xxxx-xxx-xxx-xxx.ngrok-free.app` の部分がAndroid端末でアクセスするURLです。

### ステップ3: Android端末でアクセス

1. **ngrokのURLをコピー**
   - 例: `https://xxxx-xxx-xxx-xxx.ngrok-free.app`

2. **Android端末でChromeブラウザを開く**

3. **以下のURLにアクセス**
   - **キオスク画面（入口）**: `https://xxxx-xxx-xxx-xxx.ngrok-free.app/kiosk/entry`
   - **キオスク画面（出口）**: `https://xxxx-xxx-xxx-xxx.ngrok-free.app/kiosk/exit`
   - **管理画面**: `https://xxxx-xxx-xxx-xxx.ngrok-free.app/admin/students`
   - **ログイン画面**: `https://xxxx-xxx-xxx-xxx.ngrok-free.app/admin/login`

### ステップ4: 初回アクセス時の注意

ngrokの無料版では、初回アクセス時に警告ページが表示される場合があります:

1. **「Visit Site」ボタンをクリック**
   - 画面に表示される「Visit Site」ボタンをクリック

2. **アプリケーションにアクセス**
   - 警告ページを通過すると、アプリケーションが表示されます

## 🎯 ngrokのメリット

- ✅ **安定性**: localtunnelより安定しています
- ✅ **警告ページが少ない**: 初回のみ「Visit Site」ボタンをクリックするだけ
- ✅ **パスワード不要**: localtunnelのようなパスワード入力は不要
- ✅ **Web UI**: `http://localhost:4040` でトンネルの状態を確認できます

## 📊 ngrokのWeb UI

ngrokを起動すると、以下のURLでWeb UIが利用できます:

```
http://localhost:4040
```

この画面で以下を確認できます:
- リクエストの履歴
- トンネルの状態
- 転送されているURL

## 🔍 トラブルシューティング

### ngrokが起動しない

```powershell
# ngrokのバージョンを確認
ngrok version

# 直接実行してみる
ngrok http 3001
```

### ポート3001が使用中

```powershell
# ポート3001を使用しているプロセスを確認
netstat -ano | findstr :3001

# 開発サーバーが起動していることを確認
# ブラウザで http://localhost:3001 にアクセス
```

### 警告ページが表示される

- 初回アクセスのみ「Visit Site」ボタンをクリック
- 一度通過すれば、次回からは警告ページは表示されません

## 📝 クイックリファレンス

```powershell
# 1. 開発サーバーを起動（既に起動中）
npm run dev

# 2. 別のターミナルでngrokを起動
npm run tunnel:ngrok

# 3. 表示されたURLをAndroid端末で使用
# 例: https://xxxx-xxx-xxx-xxx.ngrok-free.app/kiosk/entry
```

## 🎉 準備完了

これで、Android端末からアクセスできる準備が整いました！

1. ngrokを起動
2. 表示されたURLをAndroid端末で開く
3. NFC機能をテスト

問題があれば知らせてください。




