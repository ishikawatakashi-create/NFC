# デプロイ済みURL一覧

ドメイン: **nfc-toukalab.vercel.app**

## 主要ページURL

### ルートページ
- **トップページ（Supabase接続テスト）**
  - https://nfc-toukalab.vercel.app/

### 管理画面

#### 認証
- **管理者ログイン**
  - https://nfc-toukalab.vercel.app/admin/login
- **管理者登録**
  - https://nfc-toukalab.vercel.app/admin/register

#### ユーザー管理
- **ユーザー一覧**
  - https://nfc-toukalab.vercel.app/admin/students
- **ユーザー詳細（動的ルート）**
  - https://nfc-toukalab.vercel.app/admin/students/[id]
  - 例: https://nfc-toukalab.vercel.app/admin/students/1

#### ログ管理
- **入退室ログ**
  - https://nfc-toukalab.vercel.app/admin/access-logs

#### 設定
- **設定**
  - https://nfc-toukalab.vercel.app/admin/settings

### キオスク画面

- **入室画面**
  - https://nfc-toukalab.vercel.app/kiosk/entry
- **退室画面**
  - https://nfc-toukalab.vercel.app/kiosk/exit

### その他

- **環境チェック**
  - https://nfc-toukalab.vercel.app/envcheck
- **テストページ**
  - https://nfc-toukalab.vercel.app/test

## APIエンドポイント

### ヘルスチェック
- https://nfc-toukalab.vercel.app/api/health

### ユーザー管理API
- `GET /api/students` - ユーザー一覧取得
- `POST /api/students` - ユーザー作成
- `GET /api/students/[id]` - ユーザー詳細取得
- `PUT /api/students/[id]` - ユーザー更新
- `DELETE /api/students` - ユーザー削除
- `POST /api/students/bulk` - 一括登録
- `POST /api/students/sync-access-times` - アクセス時間同期

### カード管理API
- `POST /api/cards/issue` - カードトークン発行
- `POST /api/cards/verify` - カード検証
- `POST /api/cards/disable` - トークン無効化
- `DELETE /api/cards/delete` - カード登録削除

### アクセスログAPI
- `GET /api/access-logs` - ログ一覧取得
- `POST /api/access-logs` - ログ作成
- `GET /api/access-logs/[id]` - ログ詳細取得
- `PUT /api/access-logs/[id]` - ログ更新

### アクセス時間API
- `GET /api/access-times` - アクセス時間設定取得

### 管理者API
- `GET /api/admin/check` - 管理者認証チェック
- `GET /api/admin/info` - 管理者情報取得
- `POST /api/admin/register` - 管理者登録

### 自動退室API
- `POST /api/auto-exit` - 自動退室処理

---

**最終更新**: 2024年（デプロイ完了時）






