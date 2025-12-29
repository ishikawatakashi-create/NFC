# 🚀 Android端末での動作確認 - クイックスタート

## 現在の状態

✅ 開発サーバーは起動中（ポート3001）

## 次のステップ

### 1. ngrokを起動（新しいターミナル/PowerShellを開く）

```bash
npm run tunnel
```

または

```bash
npx ngrok http 3001
```

### 2. ngrokのURLを確認

ngrokを起動すると、以下のような出力が表示されます：

```
Session Status                online
Account                       (Plan: Free)
Version                       3.x.x
Region                        Japan (jp)
Latency                       50ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://xxxx-xxx-xxx-xxx.ngrok-free.app -> http://localhost:3001
```

**重要**: `https://xxxx-xxx-xxx-xxx.ngrok-free.app` の部分がAndroid端末でアクセスするURLです。

### 3. ngrokのWeb UIからURLを確認（オプション）

ブラウザで以下のURLを開くと、ngrokの管理画面が表示されます：
```
http://localhost:4040
```

この画面から、転送されているURLを確認できます。

### 4. Android端末でアクセス

1. Android端末でChromeブラウザを開く
2. 上記のngrok URLにアクセス
   - **キオスク画面（入口）**: `https://xxxx-xxx-xxx-xxx.ngrok-free.app/kiosk/entry`
   - **キオスク画面（出口）**: `https://xxxx-xxx-xxx-xxx.ngrok-free.app/kiosk/exit`
   - **管理画面**: `https://xxxx-xxx-xxx-xxx.ngrok-free.app/admin/students`
   - **ログイン画面**: `https://xxxx-xxx-xxx-xxx.ngrok-free.app/admin/login`

### 5. 初回アクセス時の注意

ngrokの無料版では、初回アクセス時に警告ページが表示される場合があります：
- 「Visit Site」ボタンをクリックして続行してください

## トラブルシューティング

### ngrokが起動しない

**エラー**: `port 4040 is already in use`

**解決策**: 既存のngrokプロセスを終了
```bash
# Windows PowerShell
Get-Process | Where-Object {$_.ProcessName -like "*ngrok*"} | Stop-Process
```

### Android端末でアクセスできない

1. **ngrokが起動しているか確認**
   - ターミナルにURLが表示されているか
   - `http://localhost:4040` にアクセスできるか

2. **URLが正しいか確認**
   - `https://` で始まっているか
   - ポート番号が含まれていないか（ngrok URLにはポート番号は不要）

3. **インターネット接続を確認**
   - ngrokはインターネット経由でアクセスするため、Android端末もインターネットに接続されている必要があります

## NFC機能のテスト

### 前提条件

- ✅ Android端末でChromeブラウザを使用
- ✅ NFCが有効になっている（設定 → 接続済みのデバイス → NFC）
- ✅ HTTPS環境（ngrokで自動対応）

### テスト手順

1. **管理画面でカード登録**
   - `/admin/students` にアクセス
   - ログイン（必要に応じて）
   - 生徒の「カード登録」ボタンをクリック
   - NFCカードを端末にタッチ

2. **キオスク画面で入退室テスト**
   - `/kiosk/entry` または `/kiosk/exit` にアクセス
   - 「カードをタッチ」ボタンをクリック
   - NFCカードを端末にタッチ
   - 入退室が記録されることを確認

## 便利なコマンド

```bash
# 開発サーバーを起動
npm run dev

# ngrokでトンネルを作成（別ターミナル）
npm run tunnel

# 両方を同時に起動したい場合（concurrentlyが必要）
# npm install -D concurrently
# その後、package.jsonに追加:
# "dev:tunnel": "concurrently \"npm run dev\" \"npm run tunnel\""
```


