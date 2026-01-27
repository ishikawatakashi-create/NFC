# LINE連携機能 実装状況まとめ

## 📋 概要

このドキュメントは、現在実装されているLINE連携機能をすべて整理したものです。

---

## 🗂️ 目次

1. [データベース構造](#データベース構造)
2. [APIエンドポイント](#apiエンドポイント)
3. [主要機能](#主要機能)
4. [フロントエンド実装](#フロントエンド実装)
5. [通知機能の詳細](#通知機能の詳細)
6. [Webhook機能](#webhook機能)
7. [環境変数](#環境変数)

---

## データベース構造

### テーブル一覧

#### 1. `parents` テーブル
親御さん情報を管理

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| site_id | TEXT | サイトID（マルチテナント対応） |
| name | TEXT | 親御さんの名前 |
| phone_number | TEXT | 電話番号 |
| email | TEXT | メールアドレス |
| relationship | TEXT | 続柄（mother, father, guardian, other） |
| notes | TEXT | 備考 |
| created_at | TIMESTAMPTZ | 作成日時 |
| updated_at | TIMESTAMPTZ | 更新日時 |

#### 2. `parent_students` テーブル
親御さんと生徒の紐付け（多対多）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| parent_id | UUID | 親御さんID（parents.id） |
| student_id | UUID | 生徒ID（students.id） |
| is_primary | BOOLEAN | 主な連絡先かどうか |
| created_at | TIMESTAMPTZ | 作成日時 |

#### 3. `parent_line_accounts` テーブル
親御さんのLINEアカウント情報（1対1）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| parent_id | UUID | 親御さんID（parents.id） |
| line_user_id | TEXT | LINE Messaging APIのユーザーID（UNIQUE） |
| line_display_name | TEXT | LINEの表示名 |
| is_active | BOOLEAN | 通知が有効かどうか |
| subscribed_at | TIMESTAMPTZ | LINE連携開始日時 |
| unsubscribed_at | TIMESTAMPTZ | LINE連携解除日時 |
| created_at | TIMESTAMPTZ | 作成日時 |
| updated_at | TIMESTAMPTZ | 更新日時 |

#### 4. `line_followers` テーブル
LINE公式アカウントの友だち一覧

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| site_id | TEXT | サイトID |
| line_user_id | TEXT | LINE Messaging APIのユーザーID |
| line_display_name | TEXT | LINEの表示名 |
| picture_url | TEXT | LINEのプロフィール画像URL |
| is_active | BOOLEAN | 友だち状態かどうか |
| followed_at | TIMESTAMPTZ | 友だち追加日時 |
| unfollowed_at | TIMESTAMPTZ | 友だち解除日時 |
| created_at | TIMESTAMPTZ | 作成日時 |
| updated_at | TIMESTAMPTZ | 更新日時 |

#### 5. `line_notification_logs` テーブル
LINE通知送信履歴

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| site_id | TEXT | サイトID |
| access_log_id | UUID | 入退室ログID（access_logs.id） |
| parent_id | UUID | 親御さんID（parents.id） |
| student_id | UUID | 生徒ID（students.id） |
| event_type | TEXT | イベント種別（entry, exit, forced_exit） |
| line_user_id | TEXT | LINEユーザーID |
| message_sent | TEXT | 送信したメッセージ内容 |
| status | TEXT | 送信ステータス（success, failed, pending） |
| error_message | TEXT | エラーメッセージ（失敗時） |
| sent_at | TIMESTAMPTZ | 送信日時 |
| created_at | TIMESTAMPTZ | 作成日時 |

---

## APIエンドポイント

### 親御さん管理

#### `GET /api/parents`
親御さん一覧を取得

**レスポンス:**
```json
{
  "ok": true,
  "parents": [
    {
      "id": "uuid",
      "name": "山田花子",
      "phoneNumber": "090-1234-5678",
      "email": "yamada@example.com",
      "relationship": "mother",
      "notes": "備考",
      "lineAccount": {
        "id": "uuid",
        "lineUserId": "U1234567890...",
        "lineDisplayName": "山田花子",
        "isActive": true
      },
      "students": [
        {
          "id": "uuid",
          "name": "太郎"
        }
      ]
    }
  ]
}
```

#### `POST /api/parents`
親御さんを追加

**リクエスト:**
```json
{
  "name": "山田花子",
  "phoneNumber": "090-1234-5678",
  "email": "yamada@example.com",
  "relationship": "mother",
  "notes": "備考",
  "studentIds": ["uuid1", "uuid2"]
}
```

#### `GET /api/parents/[id]`
親御さん情報を取得

#### `PATCH /api/parents/[id]`
親御さん情報を更新

#### `DELETE /api/parents/[id]`
親御さんを削除

### LINEアカウント管理

#### `GET /api/parents/[id]/line-account`
LINEアカウント情報を取得

**レスポンス:**
```json
{
  "ok": true,
  "lineAccount": {
    "id": "uuid",
    "lineUserId": "U1234567890...",
    "lineDisplayName": "山田花子",
    "isActive": true,
    "subscribedAt": "2026-01-25T10:00:00Z",
    "unsubscribedAt": null
  }
}
```

#### `POST /api/parents/[id]/line-account`
LINEアカウントを紐付け

**リクエスト:**
```json
{
  "lineUserId": "U1234567890abcdefghijklmnopqrstuv",
  "lineDisplayName": "山田花子"
}
```

**機能:**
- 既存のアカウントがある場合は更新
- 新規の場合は作成
- `is_active` を `true` に設定
- `subscribed_at` を現在時刻に設定

#### `DELETE /api/parents/[id]/line-account`
LINEアカウントの紐付けを解除

**機能:**
- `is_active` を `false` に設定
- `unsubscribed_at` を現在時刻に設定
- 物理削除ではなく論理削除

### 生徒紐付け管理

#### `GET /api/parents/[id]/students`
紐づけ生徒一覧を取得

#### `POST /api/parents/[id]/students`
生徒との紐付けを追加

**リクエスト:**
```json
{
  "studentId": "uuid"
}
```

#### `DELETE /api/parents/[id]/students/[studentId]`
紐付けを削除

### LINE Webhook

#### `POST /api/line/webhook`
LINE公式アカウントからのWebhookを受信

**処理するイベント:**
- `follow`: 友だち追加
- `unfollow`: 友だち解除
- `message`: メッセージ受信

**機能:**
- 署名検証（HMAC-SHA256）
- LINE User IDの自動取得・保存
- LINEプロフィール情報の取得（表示名、画像URL）
- `line_followers` テーブルへの保存
- 既存の `parent_line_accounts` の自動アクティブ化

### LINEフォロワー管理

#### `GET /api/line/followers`
LINE公式アカウントの友だち一覧を取得

**レスポンス:**
```json
{
  "ok": true,
  "followers": [
    {
      "userId": "U1234567890...",
      "displayName": "山田花子",
      "pictureUrl": "https://..."
    }
  ],
  "count": 10
}
```

---

## 主要機能

### 1. 入退室通知機能

**実装ファイル:** `lib/line-notification-utils.ts`

**関数:** `sendLineNotificationToParents()`

**処理フロー:**
1. 生徒IDから `parent_students` テーブルで親御さんを検索
2. 親御さんIDから `parent_line_accounts` テーブルでアクティブなLINEアカウントを取得
3. 通知テンプレートを取得（`point_settings` テーブル）
4. テンプレートのタグを置換（`[生徒名]`, `[現在時刻]`）
5. 各親御さんにLINEメッセージを送信
6. 送信結果を `line_notification_logs` テーブルに記録

**通知タイミング:**
- 入室時（`eventType === "entry"`）
- 退室時（`eventType === "exit"`）
- 自動退室時（`eventType === "forced_exit"`）

**条件:**
- 生徒の `role` が `"student"` の場合のみ
- 親御さんと生徒が紐づいている
- LINEアカウントが登録されていて `is_active === true`

**呼び出し元:**
- `app/api/access-logs/route.ts` (入退室ログ作成時)
- `app/api/access-logs/route.ts` (自動退室処理時)

### 2. LINEメッセージ送信機能

**実装ファイル:** `lib/line-notification-utils.ts`

**関数:** `sendLineMessage()`

**機能:**
- LINE Messaging APIを使用してメッセージを送信
- エラーハンドリングとログ記録

**APIエンドポイント:**
- `https://api.line.me/v2/bot/message/push`

### 3. 通知テンプレート機能

**テーブル:** `point_settings`

**カラム:**
- `entry_notification_template`: 入室通知テンプレート
- `exit_notification_template`: 退室通知テンプレート

**デフォルトテンプレート:**
- 入室: `"[生徒名]さんが入室しました。\n時刻: [現在時刻]"`
- 退室: `"[生徒名]さんが退室しました。\n時刻: [現在時刻]"`
- 自動退室: `"[生徒名]さんが自動退室しました。\n時刻: [現在時刻]"`

**タグ置換:**
- `[生徒名]` → 実際の生徒名
- `[現在時刻]` → 現在の日時（日本語形式）

### 4. LINE User ID取得機能

**方法1: Webhook経由（自動）**
- 友だち追加時（`follow` イベント）
- メッセージ受信時（`message` イベント）
- `line_followers` テーブルに自動保存

**方法2: 管理画面で手動入力**
- 管理者がLINE User IDを入力
- `/api/parents/[id]/line-account` にPOST

**方法3: LINE公式アカウントマネージャーから取得**
- 管理画面で確認可能

---

## フロントエンド実装

### 親御さん管理画面

**ファイル:** `app/admin/parents/page.tsx`

**実装機能:**

#### 1. 親御さん一覧表示
- 親御さん情報の一覧表示
- LINEアカウントの紐付け状態を表示
- 紐づけ生徒の表示

#### 2. 親御さん登録
- 新規親御さん登録フォーム
- LINE User IDの同時入力対応
- 登録時に自動でLINEアカウント紐付け

#### 3. LINEアカウント紐付け
- LINE User ID入力ダイアログ
- LINE表示名の入力
- 既存アカウントの更新対応

#### 4. 生徒紐付け
- 親御さんと生徒の紐付け管理
- 複数生徒の同時紐付け対応

#### 5. 親御さん編集・削除
- 親御さん情報の編集
- 親御さん削除（CASCADE削除）

**UIコンポーネント:**
- テーブル表示
- ダイアログ（登録・編集・削除・LINE紐付け・生徒紐付け）
- バッジ（LINEアカウント状態表示）

---

## 通知機能の詳細

### 通知送信フロー

```
1. 生徒がNFCカードをタッチ
   ↓
2. POST /api/access-logs
   ↓
3. 入退室ログを作成
   ↓
4. 生徒のroleを確認
   ↓
5. role === "student" の場合
   ↓
6. sendLineNotificationToParents() を呼び出し
   ↓
7. parent_students から親御さんを検索
   ↓
8. parent_line_accounts からアクティブなLINEアカウントを取得
   ↓
9. 通知テンプレートを取得・置換
   ↓
10. 各親御さんにLINEメッセージを送信
   ↓
11. line_notification_logs に送信履歴を記録
```

### 通知メッセージ例

**入室通知:**
```
太郎さんが入室しました。
時刻: 2026/01/25 15:30
```

**退室通知:**
```
太郎さんが退室しました。
時刻: 2026/01/25 18:00
```

**自動退室通知:**
```
太郎さんが自動退室しました。
時刻: 2026/01/25 22:00
```

### エラーハンドリング

- LINE APIエラー時はログに記録
- 通知失敗時も入退室ログは正常に作成される
- 送信履歴は `line_notification_logs` に記録（成功・失敗問わず）

---

## Webhook機能

### 実装ファイル
`app/api/line/webhook/route.ts`

### 処理するイベント

#### 1. `follow` イベント（友だち追加）
- LINE User IDを取得
- LINEプロフィール情報を取得（表示名、画像URL）
- `line_followers` テーブルに保存
- 既存の `parent_line_accounts` がある場合は自動アクティブ化

#### 2. `unfollow` イベント（友だち解除）
- `parent_line_accounts` を非アクティブ化
- `line_followers` を非アクティブ化
- `unsubscribed_at` を設定

#### 3. `message` イベント（メッセージ受信）
- LINE User IDを取得
- LINEプロフィール情報を取得
- `line_followers` テーブルに保存または更新
- 既存の `parent_line_accounts` がある場合は自動アクティブ化

### セキュリティ

- **署名検証:** HMAC-SHA256を使用
- **環境変数:** `LINE_CHANNEL_SECRET` を使用

### ログ出力

- 友だち追加: `[LineWebhook] Saved new LINE follower: {lineUserId}`
- 友だち解除: `[LineWebhook] Deactivated LINE account: {lineUserId}`
- メッセージ受信: `[LineWebhook] Saved new LINE follower via message: {lineUserId}`

---

## 環境変数

### 必須環境変数

```env
# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
LINE_CHANNEL_SECRET=your_channel_secret_here

# サイトID
SITE_ID=your_site_id
```

### 環境変数の説明

| 変数名 | 説明 | 取得方法 |
|--------|------|----------|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging APIのチャネルアクセストークン | LINE Developers Console → Messaging API設定 |
| `LINE_CHANNEL_SECRET` | LINE Messaging APIのチャネルシークレット | LINE Developers Console → Messaging API設定 |
| `SITE_ID` | サイトID（マルチテナント対応） | 既存の設定 |

---

## ファイル構成

### バックエンド

```
app/api/
├── line/
│   ├── webhook/
│   │   └── route.ts          # LINE Webhookエンドポイント
│   └── followers/
│       └── route.ts          # LINEフォロワー一覧取得
├── parents/
│   ├── route.ts              # 親御さん管理
│   └── [id]/
│       ├── route.ts          # 親御さん詳細・更新・削除
│       └── line-account/
│           └── route.ts      # LINEアカウント管理
└── access-logs/
    └── route.ts              # 入退室ログ（通知送信処理含む）

lib/
└── line-notification-utils.ts  # LINE通知送信ユーティリティ
```

### フロントエンド

```
app/admin/
└── parents/
    └── page.tsx              # 親御さん管理画面
```

### マイグレーション

```
migrations/
├── create_parent_line_notification_tables.sql  # 親御さん・LINE関連テーブル
└── create_line_followers_table.sql             # LINEフォロワーテーブル
```

### ドキュメント

```
docs/
├── line-integration-flow.md                    # LINE連携フロー完全ガイド
├── line-notification-setup-guide.md            # LINE通知設定ガイド
├── line-notification-mechanism-explanation.md   # LINE通知メカニズム説明
└── line-integration-features-summary.md         # このドキュメント
```

---

## 実装済み機能一覧

### ✅ 実装済み

1. **親御さん管理**
   - 親御さん登録・編集・削除
   - 親御さん一覧取得

2. **LINEアカウント管理**
   - LINEアカウント紐付け
   - LINEアカウント情報取得
   - LINEアカウント紐付け解除

3. **生徒紐付け管理**
   - 親御さんと生徒の紐付け
   - 紐付け解除

4. **入退室通知**
   - 入室通知
   - 退室通知
   - 自動退室通知
   - 通知テンプレート機能
   - 通知送信履歴記録

5. **Webhook機能**
   - 友だち追加イベント処理
   - 友だち解除イベント処理
   - メッセージ受信イベント処理
   - 署名検証

6. **LINEフォロワー管理**
   - フォロワー一覧取得

7. **管理画面UI**
   - 親御さん管理画面
   - LINEアカウント紐付けUI

### ⚠️ 未実装（今後の拡張）

1. **通知履歴画面**
   - 送信履歴一覧表示
   - 失敗した通知の再送機能

2. **LINE User ID取得の自動化**
   - QRコード表示機能
   - 自動紐付け機能（Webhook経由）

3. **通知テンプレート管理画面**
   - テンプレート編集UI

---

## 関連ドキュメント

- [LINE連携フロー完全ガイド](./line-integration-flow.md)
- [LINE通知設定ガイド](./line-notification-setup-guide.md)
- [LINE通知メカニズム説明](./line-notification-mechanism-explanation.md)

---

## 更新履歴

- 2026-01-25: 初版作成
