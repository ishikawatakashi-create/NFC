# 🔗 クイックリンク集

## 📱 ngrok URL（現在有効）

```
https://oppositionary-proletarianly-kena.ngrok-free.dev
```

---

## 🚪 キオスク画面（入退室記録）

### 入室画面
```
https://oppositionary-proletarianly-kena.ngrok-free.dev/kiosk/entry
```
**用途:** 教室の入口に設置。生徒がカードをタッチして入室を記録

### 退室画面
```
https://oppositionary-proletarianly-kena.ngrok-free.dev/kiosk/exit
```
**用途:** 教室の出口に設置。生徒がカードをタッチして退室を記録

---

## 👨‍💼 管理画面

### ログイン画面
```
https://oppositionary-proletarianly-kena.ngrok-free.dev/admin/login
```

### 生徒管理
```
https://oppositionary-proletarianly-kena.ngrok-free.dev/admin/students
```
**機能:** 生徒の追加・編集・削除、カード登録

### 入退室ログ
```
https://oppositionary-proletarianly-kena.ngrok-free.dev/admin/access-logs
```
**機能:** 入退室の履歴確認、検索、フィルタリング

### 通知管理
```
https://oppositionary-proletarianly-kena.ngrok-free.dev/admin/notifications
```
**機能:** 通知設定、通知履歴

### 設定
```
https://oppositionary-proletarianly-kena.ngrok-free.dev/admin/settings
```
**機能:** システム設定、開放時間設定

---

## 🧪 テスト・デバッグ

### NFCテストページ
```
https://oppositionary-proletarianly-kena.ngrok-free.dev/nfc-test
```
**用途:** NFCカードの読み取りテスト、デバッグ

### 環境変数確認
```
https://oppositionary-proletarianly-kena.ngrok-free.dev/envcheck
```
**用途:** 環境変数が正しく設定されているか確認

---

## 📋 QRコード生成（推奨）

入退室画面のURLをQRコードに変換して、各端末に表示しておくと便利です。

### オンラインQRコード生成ツール
- https://www.qr-code-generator.com/
- https://www.the-qrcode-generator.com/

### 手順
1. 上記サイトにアクセス
2. 入室画面のURL（`https://oppositionary-proletarianly-kena.ngrok-free.dev/kiosk/entry`）を入力
3. QRコードをダウンロード
4. 印刷して端末の近くに貼る

---

## 📱 Android端末での設定

### ホーム画面にショートカットを追加

#### 入室画面のショートカット
1. Chromeで入室画面を開く
2. メニュー（右上の3点）→「ホーム画面に追加」
3. 名前を「入室」に変更
4. 追加

#### 退室画面のショートカット
1. Chromeで退室画面を開く
2. メニュー（右上の3点）→「ホーム画面に追加」
3. 名前を「退室」に変更
4. 追加

これで、ホーム画面から直接アクセスできます！

---

## 🔄 ngrok URLの更新

ngrokの無料版では、**再起動するたびにURLが変わります**。

### 現在のURLを確認する方法

ターミナル8の出力を確認：
```
ngrok                                                                    
Forwarding    https://oppositionary-proletarianly-kena.ngrok-free.dev -> http://localhost:3001
```

または、ブラウザで以下にアクセス：
```
http://localhost:4040
```

---

## 💡 Tips

### キオスク画面を全画面表示にする

Android Chromeで：
1. 画面をタップ
2. メニュー → 「ホーム画面に追加」
3. ホーム画面のアイコンからアクセス
4. 自動的に全画面表示になります

### ブラウザを常時起動しておく

設定 → アプリ → Chrome → バッテリー → 「バックグラウンド使用を制限しない」

### 画面を常時ONにする

設定 → ディスプレイ → スリープ → 「なし」

---

## 🚨 トラブルシューティング

### 「接続できません」と表示される

**原因:** ngrokが停止している、またはURLが変更された

**対処法:**
1. ターミナル8でngrokが起動しているか確認
2. 新しいURLを確認
3. リンクを更新

### 「このサイトにアクセスできません」と表示される

**原因:** 開発サーバーが停止している

**対処法:**
1. ターミナル3で`npm run dev`が起動しているか確認
2. 再起動する場合: `Ctrl+C` → `npm run dev`

---

## 📞 緊急連絡先

システム管理者: [連絡先を記入]

---

**最終更新:** 2025-12-28


