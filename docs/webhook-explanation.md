# Webhook（ウェブフック）とは？

## 📚 基本的な説明

### Webhookとは？

**Webhook（ウェブフック）**は、あるサービス（LINE公式アカウントなど）から、特定のイベント（友だち追加、メッセージ受信など）が発生したときに、**自動的にあなたのサーバーに通知を送る仕組み**です。

### 簡単な例

```
LINE公式アカウントに友だちが追加された
    ↓
LINEが「友だち追加されたよ！」という通知を送る
    ↓
あなたのサーバー（Webhook URL）が通知を受け取る
    ↓
サーバーがLINE User IDを記録する
```

---

## 🔄 通常のAPIとの違い

### 通常のAPI（ポーリング方式）
```
あなたのサーバー: 「友だち追加された人はいますか？」
LINE: 「いいえ」
（数秒後）
あなたのサーバー: 「友だち追加された人はいますか？」
LINE: 「いいえ」
（数秒後）
あなたのサーバー: 「友だち追加された人はいますか？」
LINE: 「はい、1人います」
```

**問題点**: 常にサーバーからLINEに問い合わせる必要がある（無駄が多い）

### Webhook方式
```
友だち追加が発生
    ↓
LINE: 「友だち追加がありました！通知します！」
    ↓
あなたのサーバー: 「了解しました。記録します」
```

**メリット**: イベントが発生したときだけ通知が来る（効率的）

---

## 🌐 Webhook URLとは？

**Webhook URL**は、LINEが通知を送る先の**あなたのサーバーのアドレス**です。

### 例

```
https://xxxx-xxxx-xxxx.ngrok.io/api/line/webhook
```

このURLの意味：
- `https://xxxx-xxxx-xxxx.ngrok.io` = あなたのサーバーのアドレス
- `/api/line/webhook` = LINEからの通知を受け取るエンドポイント

---

## 📱 LINE通知システムでのWebhookの役割

### 1. 友だち追加イベント

```
親御さんがLINE公式アカウントを友だち追加
    ↓
LINEがWebhook URLに通知を送る
    ↓
あなたのサーバー（/api/line/webhook）が通知を受け取る
    ↓
LINE User IDを取得してログに記録
    ↓
管理者がそのIDを使って親御さんとLINEアカウントを紐付け
```

### 2. メッセージ受信イベント（将来の拡張用）

```
親御さんがLINE公式アカウントにメッセージを送る
    ↓
LINEがWebhook URLに通知を送る
    ↓
あなたのサーバーがメッセージ内容を処理
    ↓
自動応答やコマンド処理など
```

---

## 🔧 なぜローカル開発でngrokが必要なのか？

### 問題点

- LINEのサーバーはインターネット上にある
- あなたのローカルサーバー（`localhost:3000`）は、あなたのPCの中だけにある
- LINEのサーバーから、あなたのPCの中のサーバーに直接アクセスできない

### 解決方法: ngrok

**ngrok**は、ローカルサーバーをインターネット上に公開するトンネルサービスです。

```
あなたのPC（localhost:3000）
    ↓
ngrok（トンネル）
    ↓
インターネット上（https://xxxx.ngrok.io）
    ↓
LINEのサーバーからアクセス可能
```

---

## 📝 実際の設定手順

### ステップ1: 開発サーバーを起動

```bash
npm run dev
```

サーバーが `http://localhost:3000` で起動します。

### ステップ2: ngrokでトンネルを作成

別のターミナルで：

```bash
ngrok http 3000
```

ngrokが以下のようなURLを表示します：
```
Forwarding  https://xxxx-xxxx-xxxx.ngrok.io -> http://localhost:3000
```

### ステップ3: Webhook URLを設定

LINE Developers Consoleで：
- Webhook URL欄に以下を入力：
  ```
  https://xxxx-xxxx-xxxx.ngrok.io/api/line/webhook
  ```
- 「保存」をクリック
- 「検証」ボタンをクリックして接続を確認

### ステップ4: 動作確認

1. 自分のLINEアプリで公式アカウントを友だち追加
2. 開発サーバーのターミナルでログを確認：
   ```
   [LineWebhook] New LINE user followed: U1234567890...
   ```

---

## ⚠️ 注意事項

### ngrokの無料プランの制限

- URLが毎回変わる（ngrokを再起動すると変わる）
- セッション時間の制限がある
- 本番環境では、固定のドメイン（例: VercelのURL）を使用する

### 本番環境の場合

- Vercelなどにデプロイした場合、固定のURLが使える
- 例: `https://your-app.vercel.app/api/line/webhook`
- ngrokは不要

---

## 🎯 まとめ

- **Webhook**: イベントが発生したときに自動的に通知を送る仕組み
- **Webhook URL**: 通知を受け取るサーバーのアドレス
- **ngrok**: ローカルサーバーをインターネット上に公開するツール
- **目的**: LINE公式アカウントのイベント（友だち追加など）を自動的に処理する

---

## 📚 参考リンク

- [LINE Messaging API - Webhook](https://developers.line.biz/ja/docs/messaging-api/receiving-messages/)
- [ngrok公式サイト](https://ngrok.com/)

---

**最終更新**: 2025年1月

