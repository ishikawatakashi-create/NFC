# LINEリッチメニュー クイックセットアップガイド

## 📋 概要

作成した画像を使って、LINEリッチメニューを簡単に設定する方法です。

---

## ✅ 画像の配置（完了済み）

画像は既に `public/images/rich-menu.png` に配置されています。

---

## 🚀 リッチメニューの設定方法

### 方法1: スクリプトを使用（推奨）

1. **開発サーバーを起動**（まだ起動していない場合）

```powershell
npm run dev
```

2. **別のターミナルでスクリプトを実行**

```powershell
npx tsx scripts/setup-rich-menu.ts
```

### 方法2: ブラウザの開発者コンソールから実行

1. **開発サーバーを起動**

```powershell
npm run dev
```

2. **ブラウザで管理画面を開き、開発者コンソール（F12）を開く**

3. **以下のコードを実行**

```javascript
fetch('/api/line/rich-menu', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    imageUrl: `${window.location.origin}/images/rich-menu.png`,
  }),
})
  .then(res => res.json())
  .then(data => {
    if (data.ok) {
      console.log('✅ リッチメニュー設定完了！');
      console.log('Rich Menu ID:', data.richMenuId);
    } else {
      console.error('❌ エラー:', data.error);
    }
  });
```

### 方法3: cURLコマンド（本番環境用）

**開発環境の場合:**
```bash
curl -X POST http://localhost:3000/api/line/rich-menu \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "http://localhost:3000/images/rich-menu.png"}'
```

**本番環境の場合:**
```bash
curl -X POST https://your-domain.vercel.app/api/line/rich-menu \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://your-domain.vercel.app/images/rich-menu.png"}'
```

---

## 📱 動作確認

1. **LINEアプリを開く**
2. **LINE公式アカウントのトーク画面を開く**
3. **画面下部にリッチメニューが表示されることを確認**
   - 左側: 「カード紐づけ」（青）
   - 右側: 「公式アカウントについて」（緑）
4. **「カード紐づけ」ボタンをタップ**
5. **紐づけURLが発行されることを確認**

---

## 🔍 トラブルシューティング

### リッチメニューが表示されない

- LINEアプリを再起動してみる
- 友だち追加後、少し時間が経過しているか確認（反映に時間がかかる場合があります）
- リッチメニューが正しく設定されているか確認：

```bash
curl http://localhost:3000/api/line/rich-menu
```

### 画像が読み込めない

- 画像URLが正しいか確認
- 開発環境の場合、`http://localhost:3000/images/rich-menu.png` にアクセスして画像が表示されるか確認
- 本番環境の場合、HTTPSでアクセス可能か確認

### ボタンをタップしても反応しない

- サーバーログを確認（postbackイベントが来ているか）
- Webhookが正しく設定されているか確認
- LINE Developers ConsoleでWebhook URLが正しく設定されているか確認

---

## 📝 次のステップ

リッチメニューが正常に動作することを確認したら：

1. **本番環境にデプロイ**
2. **本番環境のURLでリッチメニューを再設定**
3. **親御さんに案内**

---

## 💡 ヒント

- リッチメニューは無料枠でも利用可能です
- メッセージ通数を消費しません
- テキストメッセージ「カード紐づけを開始します」とリッチメニューの両方で動作します
