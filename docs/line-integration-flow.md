# LINE公式アカウント連携フロー完全ガイド

## 📋 目次
1. [システム概要](#システム概要)
2. [セットアップ手順](#セットアップ手順)
3. [運用フロー](#運用フロー)
4. [親御さんとの紐付け方法](#親御さんとの紐付け方法)
5. [トラブルシューティング](#トラブルシューティング)

---

## システム概要

### アーキテクチャ
```
子どもがNFCカードをタッチ
    ↓
入退室API処理 (/api/access-logs)
    ↓
role='student'の場合のみ通知処理
    ↓
parent_studentsテーブルから親御さんを検索
    ↓
parent_line_accountsテーブルからLINE User IDを取得
    ↓
LINE Messaging APIで通知送信
    ↓
line_notification_logsに送信履歴を記録
```

### データベース構造
```
students (生徒)
    ↕ (多対多)
parent_students (紐付け)
    ↕
parents (親御さん)
    ↕ (1対1)
parent_line_accounts (LINEアカウント)
```

---

## セットアップ手順

### 1. LINE Developersでチャネルを作成

1. **LINE Developers Console にアクセス**
   - https://developers.line.biz/console/

2. **新しいプロバイダーを作成**（既存のものがない場合）
   - プロバイダー名を入力（例：「〇〇塾」）

3. **Messaging APIチャネルを作成**
   - チャネルタイプ: **Messaging API**
   - チャネル名: 「〇〇塾 入退室通知」
   - チャネル説明: 「生徒の入退室を保護者に通知するシステム」
   - 大業種/小業種: 適切なものを選択
   - メールアドレス: 管理者のメールアドレス

4. **Messaging API設定を行う**
   - チャネル作成後、「Messaging API設定」タブに移動
   - **チャネルアクセストークン**を発行
     - 「チャネルアクセストークン（長期）」の「発行」ボタンをクリック
     - 発行されたトークンをコピーして保管（後で使用）

### 2. 環境変数の設定

`.env.local`ファイルに以下を追加：

```env
# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here

# サイトID（既存の設定があればそのまま）
SITE_ID=your_site_id
```

### 3. LINE Webhook URLの設定

1. **デプロイ済みのWebhook URLを確認**
   - 本番環境: `https://your-domain.vercel.app/api/line/webhook`
   - 開発環境（ngrok使用時）: `https://your-ngrok-url.ngrok.io/api/line/webhook`

2. **LINE Developers Consoleで設定**
   - 「Messaging API設定」タブに移動
   - **Webhook URL** に上記のURLを設定
   - **Webhook の利用** を「オン」に設定
   - **検証**ボタンをクリックして接続を確認

3. **応答メッセージを無効化**
   - LINE公式アカウントマネージャー (https://manager.line.biz/) にアクセス
   - 該当のアカウントを選択
   - 「応答設定」→「応答メッセージ」を「オフ」
   - 「Webhook」を「オン」

### 4. データベースマイグレーション実行

Supabase SQL Editorで実行：

```bash
migrations/create_parent_line_notification_tables.sql
```

すでに実行済みの場合はスキップしてください。

---

## 運用フロー

### フロー1: 最初のセットアップ（管理者）

#### ステップ1: LINE公式アカウントのQRコードを準備
1. LINE Developers Console → 該当チャネル → 「Messaging API設定」
2. **QRコード**をダウンロードまたは表示

#### ステップ2: 親御さんに配布
- QRコードを印刷または画像で配布
- 案内文の例：

```
【〇〇塾 入退室通知システム】

お子様の入退室をLINEで通知するサービスです。
以下の手順で登録してください：

1. 下記のQRコードを読み取り、友だち追加してください
2. 塾の管理者に「LINEアカウント登録希望」とお伝えください
3. 管理者が登録を完了すると、通知が届くようになります

※通知が届かない場合は、管理者までお問い合わせください
```

---

### フロー2: 親御さんとLINEアカウントの紐付け

親御さんとLINEアカウントを紐付ける方法は**2つ**あります。

---

#### **方法A: Webhookで自動取得 → 管理画面で紐付け（推奨）**

この方法は、親御さんが友だち追加した際に自動的にLINE User IDを取得します。

**親御さん側の操作:**
1. LINE公式アカウントのQRコードをスキャン
2. 友だち追加

**システム側の動作:**
- Webhook (`/api/line/webhook`) が `follow` イベントを受信
- LINE User IDがログに記録される（コンソールログに出力）

**管理者側の操作:**
1. サーバーログまたはVercelのログを確認
   ```
   [LineWebhook] New LINE user followed: U1234567890abcdefghijklmnopqrstuv. Parent needs to be linked manually.
   ```

2. 管理画面で親御さんを登録（まだの場合）
   - API: `POST /api/parents`
   ```json
   {
     "name": "山田花子",
     "phoneNumber": "090-1234-5678",
     "email": "yamada@example.com",
     "relationship": "mother",
     "studentIds": ["<生徒のUUID>"]
   }
   ```

3. LINEアカウントを紐付け
   - API: `POST /api/parents/{parent-id}/line-account`
   ```json
   {
     "lineUserId": "U1234567890abcdefghijklmnopqrstuv",
     "lineDisplayName": "山田花子"
   }
   ```

---

#### **方法B: LINE User IDを親御さんから直接取得**

親御さんに自分のLINE User IDを教えてもらう方法です。

**LINE User IDの取得方法:**

1. **方法1: LINE公式アカウントの管理画面から確認**
   - LINE公式アカウントマネージャー (https://manager.line.biz/)
   - 「チャット」→ 該当ユーザーのチャットを開く
   - ユーザー情報にUser IDが表示される

2. **方法2: Webhook経由で自動取得（方法Aと同じ）**

3. **方法3: 親御さんに最初のメッセージを送ってもらう**
   - 親御さんがLINE公式アカウントに「登録」などのメッセージを送信
   - Webhookで `message` イベントを受信し、User IDを記録

---

### フロー3: 入退室通知の自動送信

**子ども側の操作:**
1. NFCカードを端末にタッチ

**システムの自動処理:**
1. 入退室API (`POST /api/access-logs`) が呼ばれる
2. 生徒情報を取得（`students` テーブル）
3. `role='student'` の場合のみ以下を実行：
   - `parent_students` テーブルから親御さんを検索
   - `parent_line_accounts` テーブルから有効なLINEアカウントを取得
   - LINE Messaging APIで通知を送信
   - `line_notification_logs` に送信履歴を記録

**親御さん側に届く通知:**
```
太郎さんが入室しました。
時刻: 2026/01/06 15:30
```

---

## 親御さんとの紐付け方法（詳細）

### データの流れ

```
1. 親御さん登録
   POST /api/parents
   {
     "name": "山田花子",
     "phoneNumber": "090-1234-5678",
     "email": "yamada@example.com",
     "relationship": "mother",
     "studentIds": ["<生徒UUID1>", "<生徒UUID2>"]
   }
   → parents テーブルに親情報を作成
   → parent_students テーブルに生徒との紐付けを作成

2. LINEアカウント紐付け
   POST /api/parents/{parent-id}/line-account
   {
     "lineUserId": "U1234567890abcdefghijklmnopqrstuv",
     "lineDisplayName": "山田花子"
   }
   → parent_line_accounts テーブルに作成

3. 入退室時
   生徒がNFCカードをタッチ
   → parent_students から親御さんを検索
   → parent_line_accounts からLINE User IDを取得
   → LINE通知送信
```

### APIエンドポイント一覧

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `/api/parents` | GET | 親御さん一覧取得 |
| `/api/parents` | POST | 親御さん追加 |
| `/api/parents/[id]` | GET | 親御さん情報取得 |
| `/api/parents/[id]` | PATCH | 親御さん情報更新 |
| `/api/parents/[id]` | DELETE | 親御さん削除 |
| `/api/parents/[id]/line-account` | GET | LINEアカウント情報取得 |
| `/api/parents/[id]/line-account` | POST | LINEアカウント紐付け |
| `/api/parents/[id]/line-account` | DELETE | LINEアカウント紐付け解除 |
| `/api/parents/[id]/students` | GET | 紐づけ生徒一覧取得 |
| `/api/parents/[id]/students` | POST | 生徒との紐づけ追加 |
| `/api/parents/[id]/students/[studentId]` | DELETE | 紐づけ削除 |
| `/api/line/webhook` | POST | LINE Webhook（自動） |

---

## LINE User IDの取得方法（詳細）

### 方法1: Webhookログから取得（推奨）

1. **親御さんに友だち追加してもらう**
2. **サーバーログを確認**
   - Vercelの場合: Vercel Dashboard → Functions → Logs
   - ローカル開発: ターミナルのコンソール

3. **ログから User ID をコピー**
   ```
   [LineWebhook] New LINE user followed: U1234567890abcdefghijklmnopqrstuv
   ```

### 方法2: LINE公式アカウントマネージャーから取得

1. https://manager.line.biz/ にアクセス
2. 該当のアカウントを選択
3. 「チャット」タブを開く
4. 該当ユーザーのチャットを開く
5. 右上のユーザー情報アイコンをクリック
6. 「Basic ID」欄に User ID が表示される

### 方法3: テストメッセージで取得

親御さんに「登録」などのメッセージを送ってもらい、Webhookで受信：

```typescript
// app/api/line/webhook/route.ts の message イベント処理
if (event.type === "message") {
  const lineUserId = event.source.userId;
  console.log(`[LineWebhook] Message from: ${lineUserId}`);
  // このログからUser IDを取得
}
```

---

## トラブルシューティング

### 1. 通知が届かない

**チェック項目:**

- [ ] **環境変数が設定されているか**
  ```bash
  LINE_CHANNEL_ACCESS_TOKEN=xxx
  ```

- [ ] **生徒の role が 'student' になっているか**
  - `students` テーブルの `role` カラムを確認

- [ ] **親御さんと生徒が紐づいているか**
  ```sql
  SELECT * FROM parent_students WHERE student_id = '<生徒UUID>';
  ```

- [ ] **LINEアカウントが登録されているか**
  ```sql
  SELECT * FROM parent_line_accounts WHERE parent_id = '<親UUID>';
  ```

- [ ] **LINEアカウントが有効か**
  ```sql
  SELECT * FROM parent_line_accounts WHERE is_active = true;
  ```

- [ ] **LINE公式アカウントがブロックされていないか**
  - 親御さんのLINEで確認

### 2. Webhookが動作しない

**チェック項目:**

- [ ] **Webhook URLが正しく設定されているか**
  - LINE Developers Console → Messaging API設定 → Webhook URL

- [ ] **Webhookが有効になっているか**
  - LINE Developers Console → Messaging API設定 → Webhook の利用: オン

- [ ] **応答メッセージが無効化されているか**
  - LINE公式アカウントマネージャー → 応答設定

- [ ] **サーバーのログを確認**
  ```bash
  # Vercelの場合
  vercel logs --follow
  ```

### 3. LINE User IDが分からない

**解決方法:**

1. **Webhookログを確認**（方法1）
2. **LINE公式アカウントマネージャーで確認**（方法2）
3. **親御さんにテストメッセージを送ってもらう**（方法3）

### 4. 通知送信履歴を確認したい

```sql
SELECT * FROM line_notification_logs
WHERE student_id = '<生徒UUID>'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 管理画面UIの実装（今後の拡張）

現在APIは完成していますが、管理画面UIは未実装です。以下のUIが必要な場合は実装できます：

### 実装予定の画面:

1. **親御さん管理画面**
   - 親御さん一覧
   - 親御さん登録フォーム
   - 親御さん編集フォーム

2. **LINE紐付け画面**
   - LINE User ID入力フォーム
   - QRコード表示
   - 紐付けステータス表示

3. **通知履歴画面**
   - 送信履歴一覧
   - 失敗した通知の再送機能

---

## まとめ

### 最小限のセットアップ手順

1. ✅ LINE Developersでチャネル作成
2. ✅ チャネルアクセストークンを取得
3. ✅ `.env.local`に `LINE_CHANNEL_ACCESS_TOKEN` を設定
4. ✅ Webhook URLを設定
5. ✅ 親御さんに友だち追加してもらう
6. ✅ Webhookログから LINE User ID を取得
7. ✅ API経由で親御さんとLINEアカウントを紐付け
8. ✅ 子どもがNFCカードをタッチ → 通知が届く 🎉

---

## 参考リンク

- [LINE Developers Console](https://developers.line.biz/console/)
- [LINE Messaging API リファレンス](https://developers.line.biz/ja/reference/messaging-api/)
- [LINE公式アカウントマネージャー](https://manager.line.biz/)
- 既存ドキュメント: `docs/line-notification-setup-guide.md`

