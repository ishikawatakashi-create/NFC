# LINE通知機能 セットアップガイド

## 概要

公式LINEで親御さんとユーザー（属性：生徒のみ）を紐づけて、入室退室時に特定のメッセージが飛ぶ機能を実装しました。

## 実装内容

### 1. データベーステーブル

以下のテーブルを作成しました：

- `parents`: 親御さん情報テーブル
- `parent_students`: 親御さんと生徒の紐づけテーブル（多対多）
- `parent_line_accounts`: 親御さんのLINEアカウント情報テーブル
- `line_notification_logs`: LINE通知送信履歴テーブル

マイグレーションファイル: `migrations/create_parent_line_notification_tables.sql`

### 2. LINE通知機能

- 入退室時（entry/exit/forced_exit）に、生徒（role='student'）の親御さんにLINE通知を自動送信
- 通知メッセージは「[生徒名]さんが[入室/退室]しました。\n時刻: [日時]」の形式
- 通知送信履歴を`line_notification_logs`テーブルに記録

### 3. APIエンドポイント

#### 親御さん管理
- `GET /api/parents` - 親御さん一覧取得（studentIdクエリパラメータでフィルタ可能）
- `POST /api/parents` - 親御さん追加
- `GET /api/parents/[id]` - 親御さん情報取得
- `PATCH /api/parents/[id]` - 親御さん情報更新
- `DELETE /api/parents/[id]` - 親御さん削除

#### LINEアカウント管理
- `GET /api/parents/[id]/line-account` - LINEアカウント情報取得
- `POST /api/parents/[id]/line-account` - LINEアカウント紐づけ（LINE User IDを手動設定）
- `DELETE /api/parents/[id]/line-account` - LINEアカウント紐づけ解除

#### 親御さんと生徒の紐づけ
- `GET /api/parents/[id]/students` - 紐づけられている生徒一覧取得
- `POST /api/parents/[id]/students` - 生徒との紐づけ追加
- `DELETE /api/parents/[id]/students/[studentId]` - 紐づけ削除

#### LINE Webhook
- `POST /api/line/webhook` - LINE公式アカウントのWebhookエンドポイント（友だち追加/解除イベントを処理）

## セットアップ手順

### 1. データベースマイグレーション実行

SupabaseのSQL Editorで以下のマイグレーションファイルを実行してください：

```sql
-- migrations/create_parent_line_notification_tables.sql
```

### 2. 環境変数の設定

`.env.local`に以下の環境変数を追加してください：

```env
# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
```

### 3. LINE公式アカウントの設定

1. [LINE Developers](https://developers.line.biz/)でチャネルを作成
2. Messaging APIを有効化
3. チャネルアクセストークンを取得し、`.env.local`に設定
4. Webhook URLを設定: `https://your-domain.com/api/line/webhook`
5. Webhookを有効化

### 4. 親御さんとLINEアカウントの紐づけ方法

#### 方法1: 管理画面から手動で紐づけ（推奨）

1. 管理画面で親御さんを登録
2. 親御さんのLINE User IDを取得（LINE公式アカウントと友だちになった際のWebhookで取得可能）
3. 管理画面で親御さんとLINE User IDを紐づけ

#### 方法2: API経由で紐づけ

```bash
# 親御さんを追加
POST /api/parents
{
  "name": "山田花子",
  "phoneNumber": "090-1234-5678",
  "email": "yamada@example.com",
  "relationship": "mother",
  "studentIds": ["student-uuid-1", "student-uuid-2"]
}

# LINEアカウントを紐づけ
POST /api/parents/{parent-id}/line-account
{
  "lineUserId": "U1234567890abcdefghijklmnopqrstuv",
  "lineDisplayName": "山田花子"
}
```

## 使用方法

### 入退室時の通知

生徒（role='student'）が入退室すると、自動的に紐づけられている親御さんのLINEアカウントに通知が送信されます。

- 入室時: 「[生徒名]さんが入室しました。\n時刻: [日時]」
- 退室時: 「[生徒名]さんが退室しました。\n時刻: [日時]」
- 強制退室時: 「[生徒名]さんが自動退室しました。\n時刻: [日時]」

### 通知送信履歴の確認

`line_notification_logs`テーブルで通知送信履歴を確認できます。

## 注意事項

1. **LINE User IDの取得方法**
   - LINE公式アカウントと友だちになった際のWebhookイベント（`follow`）で取得可能
   - または、LINE公式アカウントの管理画面で確認可能

2. **通知が送信されない場合の確認事項**
   - 生徒の`role`が`student`であることを確認
   - 親御さんと生徒が紐づけられていることを確認
   - 親御さんのLINEアカウントが`is_active=true`であることを確認
   - `LINE_CHANNEL_ACCESS_TOKEN`が正しく設定されていることを確認

3. **通知メッセージのカスタマイズ**
   - `lib/line-notification-utils.ts`の`sendLineNotificationToParents`関数内でメッセージをカスタマイズ可能

## 今後の拡張予定

- 管理画面UIの実装（親御さん登録、LINEアカウント紐づけ、生徒との紐づけ）
- 通知テンプレートのカスタマイズ機能
- 通知送信履歴の管理画面表示






