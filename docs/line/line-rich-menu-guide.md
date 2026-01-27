# LINEリッチメニュー設定ガイド

## 📋 概要

LINEリッチメニューを使用すると、親御さんが「カード紐づけを開始します」とメッセージを送信する代わりに、リッチメニューのボタンをタップするだけで紐づけを開始できます。

**重要なポイント:**
- ✅ **リッチメニューは無料枠でも利用可能です**
- ✅ メッセージ通数を消費しません
- ✅ より直感的な操作が可能

---

## 🎯 機能の流れ

```
1. 親御さんがLINE公式アカウントを開く
   ↓
2. リッチメニューに「カード紐づけ」ボタンが表示される
   ↓
3. ボタンをタップ
   ↓
4. 自動的に紐づけURLが発行される
   ↓
5. 親御さんがURLにアクセスしてカードを読み取る
   ↓
6. 紐づけ完了
```

---

## 🔧 セットアップ手順

### ステップ1: リッチメニュー画像の準備

リッチメニューには画像が必要です。以下の仕様に従って画像を準備してください：

- **サイズ**: 2500x1686ピクセル
- **形式**: PNGまたはJPEG
- **ファイルサイズ**: 1MB以下
- **レイアウト**: 2ボタン（左: カード紐づけ、右: 公式アカウントについて）

**画像作成のヒント:**
- 左半分（0-1250px）: 「カード紐づけ」ボタン用
- 右半分（1250-2500px）: 「公式アカウントについて」ボタン用
- テキストやアイコンを配置して、ボタンの機能が分かりやすくする

### ステップ2: 画像をアップロード

リッチメニュー用の画像をHTTPSで公開アクセス可能な場所にアップロードしてください。

**推奨方法:**
1. Vercelの`public`フォルダに配置
2. または、画像ホスティングサービス（Imgur、Cloudinaryなど）を使用
3. または、Supabase Storageを使用

**例:**
```
https://your-domain.vercel.app/images/rich-menu.png
```

### ステップ3: リッチメニューを作成・設定

APIエンドポイントを使用してリッチメニューを作成・設定します。

**cURLコマンド例:**

```bash
curl -X POST https://your-domain.vercel.app/api/line/rich-menu \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://your-domain.vercel.app/images/rich-menu.png"
  }'
```

**JavaScript/TypeScript例:**

```typescript
const response = await fetch('/api/line/rich-menu', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    imageUrl: 'https://your-domain.vercel.app/images/rich-menu.png',
  }),
});

const result = await response.json();
console.log(result);
```

**成功時のレスポンス:**

```json
{
  "ok": true,
  "message": "リッチメニューを作成・設定しました",
  "richMenuId": "richmenu-xxxxxxxxxxxxx"
}
```

---

## 📱 使用方法

### リッチメニューの確認

現在設定されているリッチメニューを確認するには：

```bash
curl https://your-domain.vercel.app/api/line/rich-menu
```

### リッチメニューの削除

リッチメニューを削除するには：

```bash
curl -X DELETE "https://your-domain.vercel.app/api/line/rich-menu?richMenuId=richmenu-xxxxxxxxxxxxx"
```

---

## 🔍 トラブルシューティング

### 問題1: リッチメニューが表示されない

**確認事項:**
1. リッチメニューが正しく設定されているか（GET APIで確認）
2. LINEアプリを再起動してみる
3. 友だち追加後、少し時間が経過しているか（反映に時間がかかる場合があります）

### 問題2: 画像のアップロードに失敗する

**確認事項:**
1. 画像のサイズが2500x1686ピクセルであるか
2. 画像のファイルサイズが1MB以下であるか
3. 画像URLがHTTPSで公開アクセス可能であるか
4. 画像の形式がPNGまたはJPEGであるか

### 問題3: ボタンをタップしても反応しない

**確認事項:**
1. Webhookが正しく設定されているか
2. `postback`イベントが処理されているか（サーバーログを確認）
3. `data: "link_card"`が正しく設定されているか

---

## 🎨 リッチメニューのカスタマイズ

リッチメニューの定義は`app/api/line/rich-menu/route.ts`の`getRichMenuDefinition()`関数で変更できます。

**現在の設定:**
- 左ボタン: カード紐づけ（postback: `link_card`）
- 右ボタン: 公式アカウントについて（URIアクション）

**カスタマイズ例:**

```typescript
// 3ボタンレイアウトに変更する場合
areas: [
  {
    bounds: { x: 0, y: 0, width: 833, height: 1686 },
    action: { type: "postback", data: "link_card", ... }
  },
  {
    bounds: { x: 833, y: 0, width: 833, height: 1686 },
    action: { type: "uri", uri: "...", ... }
  },
  {
    bounds: { x: 1666, y: 0, width: 834, height: 1686 },
    action: { type: "postback", data: "help", ... }
  },
]
```

---

## 📚 参考資料

- [LINE Messaging API - リッチメニュー](https://developers.line.biz/ja/docs/messaging-api/using-rich-menus/)
- [リッチメニューの仕様](https://developers.line.biz/ja/reference/messaging-api/#rich-menu)

---

## ✅ チェックリスト

- [ ] リッチメニュー画像を準備（2500x1686px）
- [ ] 画像をHTTPSで公開アクセス可能な場所にアップロード
- [ ] リッチメニューを作成・設定（POST API）
- [ ] LINEアプリでリッチメニューが表示されることを確認
- [ ] 「カード紐づけ」ボタンをタップして動作確認
- [ ] 紐づけURLが正しく発行されることを確認
