# 管理者認証機能 セットアップガイド

## 概要

管理画面にログイン機能を追加しました。メールアドレスとパスワードでログインできるようになります。

---

## 📋 実装内容

### 1. データベース

#### 管理者テーブル（admins）
- `id`: UUID（主キー）
- `auth_user_id`: Supabase AuthのユーザーID（外部キー）
- `site_id`: サイトID
- `first_name`: 名前（名）
- `last_name`: 苗字（姓）
- `employment_type`: 雇用形態（`part_time` or `full_time`）
- `created_at`: 作成日時
- `updated_at`: 更新日時

### 2. 機能

- ✅ ログイン機能（メールアドレス + パスワード）
- ✅ パスワード要件チェック（8文字以上、大文字・小文字・数字必須）
- ✅ ログアウト機能
- ✅ 管理画面へのアクセス制限
- ✅ 管理者情報の表示

---

## 🔧 セットアップ手順

### 1. 必要なパッケージのインストール

```bash
npm install @supabase/ssr
```

または

```bash
pnpm add @supabase/ssr
```

### 2. データベースマイグレーション

Supabaseダッシュボードで以下のSQLを実行してください：

```sql
-- migrations/create_admins_table.sql の内容を実行
```

または、Supabase CLIを使用する場合：

```bash
supabase db push
```

### 3. Supabase Authの設定

Supabaseダッシュボードで以下を設定してください：

1. **Authentication > Providers > Email** を有効化
2. **Authentication > Settings > Email Auth** で以下を設定：
   - "Enable email confirmations" をオフ（管理者登録なので確認不要）
   - または、メール確認を有効にする場合は、管理者登録時にメール確認を行う

### 4. Row Level Security (RLS) の設定

`admins`テーブルにRLSポリシーを設定してください：

```sql
-- adminsテーブルのRLSを有効化
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーが自分の管理者情報を取得できるポリシー
CREATE POLICY "Users can view their own admin info"
  ON admins
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- サービスロールキーで管理者を登録できるポリシー（既にService Role Keyでアクセス可能なので、必要に応じて）
-- 通常はService Role Keyで直接アクセスできるため、このポリシーは不要です
```

**注意**: 管理者登録API（`/api/admin/register`）はService Role Keyを使用するため、RLSポリシーは不要です。

### 5. 環境変数の確認

`.env.local` に以下の環境変数が設定されていることを確認してください：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SITE_ID=your-site-uuid
```

**重要**: `SUPABASE_SERVICE_ROLE_KEY` は必須です（管理者登録時に使用）。

### 6. 初回管理者の登録

初回管理者を登録する方法は2つあります：

#### 方法1: 管理画面から登録（推奨）

1. ブラウザで `/admin/register` にアクセス
2. フォームに必要情報を入力
3. 「管理者を登録」ボタンをクリック
4. 登録成功後、自動的にログインページにリダイレクトされます

#### 方法2: APIエンドポイントを直接呼び出す

以下のいずれかの方法でAPIを呼び出します：

**A. curlコマンド（ターミナル）**
```bash
curl -X POST http://localhost:3001/api/admin/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Password123",
    "firstName": "太郎",
    "lastName": "山田",
    "employmentType": "full_time"
  }'
```

**B. PowerShell（Windows）**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/admin/register" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{
    "email": "admin@example.com",
    "password": "Password123",
    "firstName": "太郎",
    "lastName": "山田",
    "employmentType": "full_time"
  }'
```

**C. ブラウザの開発者ツール（Console）**
```javascript
fetch('/api/admin/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'Password123',
    firstName: '太郎',
    lastName: '山田',
    employmentType: 'full_time'
  })
})
.then(res => res.json())
.then(data => console.log(data))
```

**パスワード要件**:
- 8文字以上
- 大文字を含む
- 小文字を含む
- 数字を含む

**雇用形態**:
- `part_time`: アルバイト
- `full_time`: 正社員

---

## 📝 使用方法

### ログイン

1. `/admin/login` にアクセス
2. メールアドレスとパスワードを入力
3. 「ログイン」ボタンをクリック

### ログアウト

1. 管理画面右上の「ログアウト」ボタンをクリック
2. ログインページにリダイレクトされます

### 管理者登録（追加）

新しい管理者を追加する場合：

```bash
curl -X POST http://localhost:3001/api/admin/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newadmin@example.com",
    "password": "NewPassword123",
    "firstName": "花子",
    "lastName": "田中",
    "employmentType": "part_time"
  }'
```

---

## 🔒 セキュリティ

### 実装されているセキュリティ機能

1. **認証チェック**: すべての管理画面ページで認証を確認
2. **パスワード要件**: 強力なパスワードを強制
3. **セッション管理**: Supabase Authによるセッション管理
4. **サイト分離**: SITE_IDによるマルチテナント対応

### 注意事項

- **SUPABASE_SERVICE_ROLE_KEY** は絶対にクライアント側に公開しないでください
- 本番環境では、管理者登録API（`/api/admin/register`）へのアクセスを制限することを推奨します
- 定期的にパスワードを変更することを推奨します

---

## 🐛 トラブルシューティング

### 1. "この端末/ブラウザはNFC読み取りに対応していません"

**原因**: ログインページではなく、NFC関連のエラーです。無視してください。

### 2. "管理者として登録されていません"

**原因**:
- Supabase Authのユーザーは作成されたが、`admins`テーブルに登録されていない
- `SITE_ID`が一致していない

**対策**:
- `/api/admin/register` で管理者を登録
- `SITE_ID`を確認

### 3. ログインできない

**原因**:
- メールアドレスまたはパスワードが間違っている
- Supabase Authが有効化されていない

**対策**:
- SupabaseダッシュボードでEmail認証が有効になっているか確認
- パスワード要件を満たしているか確認

### 4. パッケージエラー: "@supabase/ssr" が見つからない

**対策**:
```bash
npm install @supabase/ssr
```

---

## 📚 関連ファイル

- `migrations/create_admins_table.sql`: データベースマイグレーション
- `app/admin/login/page.tsx`: ログイン画面
- `app/api/admin/register/route.ts`: 管理者登録API
- `app/api/admin/check/route.ts`: 認証チェックAPI
- `app/api/admin/info/route.ts`: 管理者情報取得API
- `lib/supabase-server.ts`: サーバー側Supabaseクライアント
- `lib/supabase-client-auth.ts`: クライアント側Supabaseクライアント
- `lib/auth-helpers.ts`: 認証ヘルパー関数
- `middleware.ts`: 認証ミドルウェア
- `components/admin/admin-layout.tsx`: 管理画面レイアウト（ログアウト機能含む）

---

## 🚀 今後の拡張案

1. **パスワードリセット機能**: メール経由でのパスワードリセット
2. **2要素認証**: TOTPやSMS認証
3. **ログイン履歴**: ログイン履歴の記録と表示
4. **権限管理**: 管理者ごとの権限設定
5. **セッション管理**: アクティブセッションの管理

---

**最終更新**: 2024年12月  
**バージョン**: 1.0.0

