# LINEアカウントとNFCカードの自己紐づけ機能ガイド

## 📋 概要

親御さんが自分でLINEアカウントとお子様のNFCカードを紐づけることができる機能です。管理者の介入なしで、親御さん自身が簡単に設定できます。

---

## 🎯 機能の流れ

```
1. 親御さんがLINE公式アカウントに「紐づけ」「登録」などのメッセージを送信
   ↓
2. LINE公式アカウントが自動でURLを発行
   ↓
3. 親御さんが発行されたURLにアクセス
   ↓
4. お子様のNFCカードをスマートフォンにタッチ（Android）
   もしくはQRコードで登録（iPhone / 読み取り失敗時）
   ↓
5. 自動的に紐づけが完了
   ↓
6. 入退室通知が届くようになる
```

---

## 🚀 セットアップ手順

### 1. データベースマイグレーションの実行

Supabase SQL Editorで以下を実行：

```sql
-- migrations/create_line_link_tokens_table.sql を実行
```

### 2. 環境変数の確認

`.env.local` に以下が設定されていることを確認：

```env
# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
LINE_CHANNEL_SECRET=your_channel_secret_here

# サイトID
SITE_ID=your_site_id

# ベースURL（本番環境の場合）
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
```

**注意:** `NEXT_PUBLIC_BASE_URL` が設定されていない場合、Vercelの自動URLが使用されます。

### 3. LINE公式アカウントの設定

LINE公式アカウントマネージャー (https://manager.line.biz/) で以下を設定：

1. **応答メッセージを無効化**
   - 「応答設定」→「応答メッセージ」を「オフ」
   - 「Webhook」を「オン」

2. **Webhook URLの設定**
   - LINE Developers Console → Messaging API設定
   - Webhook URL: `https://your-domain.vercel.app/api/line/webhook`

---

## 📱 使用方法（親御さん向け）

### ステップ1: LINE公式アカウントにメッセージを送信

以下のいずれかのメッセージを送信：

- 「紐づけ」
- 「紐付け」
- 「登録」
- 「設定」
- 「カード登録」
- 「通知登録」

### ステップ2: 発行されたURLにアクセス

LINE公式アカウントから返信されたURLをタップして開きます。

**例:**
```
カード紐づけを開始します。

以下のURLにアクセスして、お子様のNFCカードをタッチしてください。

https://your-domain.vercel.app/link-card?token=abc123...

※このURLは1時間有効です。
```

### ステップ3: NFCカードをタッチ（Android）

1. スマートフォンでURLを開く
2. 「NFCカードを読み取る」ボタンをタップ
3. お子様のNFCカードをスマートフォンに近づける
4. 読み取りが完了すると、紐づけ完了のメッセージが表示されます

### ステップ3-2: QRコードで登録（iPhone / 読み取り失敗時）

1. 画面下の「QRコードで登録」を開く
2. QRコードを読み取る
3. 読み取りが完了すると、紐づけ完了のメッセージが表示されます

### ステップ4: 完了

紐づけが完了すると、お子様の入退室時にLINE通知が届くようになります。

---

## 🔧 管理者向け機能

### 管理画面での確認

1. 管理画面 (`/admin/parents`) にアクセス
2. 親御さん一覧で、LINEアカウントの紐付け状態を確認
3. 「LINEアカウントを紐付け」ボタンで手動紐付けも可能

### 手動での紐付け解除

管理画面からLINEアカウントの紐付けを解除できます：

1. 親御さん一覧で該当の親御さんを選択
2. LINEアカウント情報を確認
3. 必要に応じて紐付けを解除

---

## 🛠️ 技術的な詳細

### データベース構造

#### `line_link_tokens` テーブル

一時トークンを管理するテーブル：

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| site_id | TEXT | サイトID |
| line_user_id | TEXT | LINEユーザーID |
| token | TEXT | 一時トークン（UNIQUE） |
| expires_at | TIMESTAMPTZ | 有効期限（1時間） |
| is_used | BOOLEAN | 使用済みフラグ |
| used_at | TIMESTAMPTZ | 使用日時 |
| created_at | TIMESTAMPTZ | 作成日時 |

### APIエンドポイント

#### `POST /api/line/link-card`

NFCカードとLINEアカウントを紐づける

**リクエスト:**
```json
{
  "token": "abc123...",
  "serialNumber": "04:1a:2b:3c:4d:5e:6f"
}
```

**レスポンス:**
```json
{
  "ok": true,
  "message": "太郎さんとの紐付けが完了しました。",
  "student": {
    "id": "uuid",
    "name": "太郎"
  }
}
```

#### `GET /api/line/link-card?token=xxx`

トークンの有効性を確認

**レスポンス:**
```json
{
  "ok": true,
  "valid": true,
  "expiresAt": "2026-01-25T12:00:00Z"
}
```

### 処理フロー

1. **トークン生成**
   - LINE Webhookで「紐づけ」メッセージを受信
   - 32バイトのランダムトークンを生成
   - `line_link_tokens` テーブルに保存（1時間有効）

2. **URL発行**
   - トークンを含むURLを生成
   - LINEメッセージで親御さんに送信

3. **NFCカード読み取り**
   - 親御さんがURLにアクセス
   - Web NFC APIでカードのシリアル番号を読み取り

4. **紐付け処理**
   - トークンを検証（有効期限、使用済みチェック）
   - シリアル番号から生徒を特定
   - LINE User IDから親御さんを検索（未登録の場合は自動作成）
   - `parent_students` テーブルに紐付けを保存
   - トークンを使用済みにする

---

## ⚠️ 注意事項

### NFCカードの互換性

- **対応カード:** NDEF形式のNFCカード（NTAG213/215/216、Mifare Ultralightなど）
- **非対応カード:** FeliCa規格（Suica、PASMO、ICOCAなど）

### QRコード登録について

- iPhoneはNFC読み取りに対応していないため、QR登録が前提です
- QRが読み取れない場合は、カードIDの手入力でも登録できます

詳細は `docs/nfc-card-compatibility.md` を参照してください。

### セキュリティ

- トークンは1時間で自動的に無効化されます
- トークンは1回のみ使用可能です
- トークンは32バイトのランダム文字列で、推測困難です

### エラーハンドリング

- トークンが無効な場合: 「無効なトークンです」と表示
- トークンが使用済みの場合: 「このトークンは既に使用済みです」と表示
- トークンが期限切れの場合: 「トークンの有効期限が切れています」と表示
- カードが未登録の場合: 「このカードは登録されていません」と表示

---

## 🐛 トラブルシューティング

### 1. URLが発行されない

**チェック項目:**
- LINE公式アカウントと友だちになっているか
- 正しいメッセージ（「紐づけ」「登録」など）を送信しているか
- Webhookが有効になっているか
- サーバーログを確認

### 2. NFCカードが読み取れない

**チェック項目:**
- スマートフォンでアクセスしているか（PCではNFCが使えません）
- NDEF対応のNFCカードか
- カードが正しく登録されているか（管理画面で確認）

### 3. 紐付けが完了しない

**チェック項目:**
- トークンの有効期限内か
- トークンが既に使用済みでないか
- カードが正しく登録されているか
- 生徒が在籍中か

### 4. 通知が届かない

**チェック項目:**
- 紐付けが正しく完了しているか（管理画面で確認）
- LINEアカウントがアクティブか
- 生徒の `role` が `"student"` か
- `LINE_CHANNEL_ACCESS_TOKEN` が正しく設定されているか

---

## 📚 関連ドキュメント

- [LINE連携機能 実装状況まとめ](./line-integration-features-summary.md)
- [LINE連携フロー完全ガイド](./line-integration-flow.md)
- [NFCカード互換性ガイド](./nfc-card-compatibility.md)

---

## 更新履歴

- 2026-01-25: 初版作成
