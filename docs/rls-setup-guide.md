# RLS（Row Level Security）セットアップガイド

## 概要

このドキュメントでは、Supabaseデータベースのすべてのテーブルに対してRLS（Row Level Security）を有効化する方法を説明します。

## 背景

Supabaseのデータベースリンターで、すべてのpublicスキーマのテーブルでRLSが無効になっていることが検出されました。これはセキュリティ上の重要な問題です。PostgRESTで公開されているテーブルは、RLSを有効にする必要があります。

## 対象テーブル

以下のテーブルに対してRLSを有効化します：

- sites
- devices
- students
- cards
- guardians
- guardian_line_links
- student_guardians
- link_codes
- access_events
- event_corrections
- points_ledger
- settings
- admins
- role_based_access_times
- card_tokens
- student_cards
- role_based_bonus_thresholds
- class_based_bonus_thresholds
- parents
- parent_students
- point_transactions
- access_logs
- parent_line_accounts
- line_notification_logs
- point_settings

## 実装内容

### 1. RLSの有効化

すべてのテーブルでRLSを有効化します。

### 2. 管理者チェック関数

以下の2つの関数を作成します：

- `public.is_admin()`: 現在のユーザーが管理者かどうかを判定
- `public.get_admin_site_id()`: 現在の管理者のsite_idを取得（マルチテナント対応）

### 3. RLSポリシー

各テーブルに対して、以下のポリシーを設定します：

- **管理者のみアクセス可能**: 管理者（`admins`テーブルに存在するユーザー）のみがアクセス可能
- **site_idによるフィルタリング**: `site_id`カラムを持つテーブルでは、管理者の`site_id`と一致するレコードのみアクセス可能

## 実行方法

### Supabaseダッシュボードから実行

1. Supabaseダッシュボードにログイン
2. **SQL Editor**を開く
3. `migrations/enable_rls_on_all_tables.sql`の内容をコピー＆ペースト
4. **Run**ボタンをクリックして実行

### Supabase CLIから実行

```bash
supabase db push
```

または

```bash
psql -h <your-db-host> -U postgres -d postgres -f migrations/enable_rls_on_all_tables.sql
```

## 注意事項

### 1. サービスロールキーの使用

APIエンドポイントでサービスロールキー（`SUPABASE_SERVICE_ROLE_KEY`）を使用している場合、RLSポリシーは適用されません。サービスロールキーはRLSをバイパスします。

### 2. 既存のデータアクセス

RLSを有効化すると、管理者以外のユーザーはデータにアクセスできなくなります。既存のアプリケーションが正常に動作することを確認してください。

### 3. テーブル構造の確認

一部のテーブル（例：`devices`、`cards`、`guardians`など）には`site_id`カラムがない可能性があります。これらのテーブルに対しては、基本的なポリシーのみを設定しています。必要に応じて、後で調整してください。

### 4. 型の不一致

`card_tokens`テーブルの`site_id`は`UUID`型、`admins`テーブルの`site_id`は`TEXT`型のため、型変換を行っています。

## トラブルシューティング

### エラー: "relation does not exist"

テーブルが存在しない場合、`ALTER TABLE IF EXISTS`を使用しているため、エラーは発生しません。存在しないテーブルはスキップされます。

### エラー: "function does not exist"

関数が既に存在する場合、`CREATE OR REPLACE FUNCTION`を使用しているため、既存の関数が置き換えられます。

### ポリシーが適用されない

1. RLSが有効になっているか確認
2. ユーザーが管理者として登録されているか確認
3. `site_id`が正しく設定されているか確認

## 検証方法

マイグレーション実行後、Supabaseダッシュボードの**Database > Linter**で、RLSエラーが解消されていることを確認してください。

## セキュリティ設定

### 漏洩パスワード保護の有効化

Supabase Authでは、漏洩パスワード保護機能を有効にすることで、HaveIBeenPwned.orgのデータベースと照合して、侵害されたパスワードの使用を防止できます。

**⚠️ 重要**: この設定はSupabaseダッシュボードから手動で有効化する必要があります。コードベースの変更では解決できません。

#### 設定方法（Supabaseダッシュボード）

1. [Supabaseダッシュボード](https://app.supabase.com)にログイン
2. プロジェクトを選択
3. 左側のメニューから **Authentication** をクリック
4. **Settings** タブを選択
5. **Password Security** セクションまでスクロール
6. **Leaked Password Protection** のトグルスイッチを **ON** に設定
7. 変更を保存

#### 設定方法（Supabase CLI）

Supabase CLIを使用する場合：

```bash
# プロジェクトにログイン
supabase login

# プロジェクトをリンク
supabase link --project-ref <your-project-ref>

# 漏洩パスワード保護を有効化
supabase auth settings update --enable-leaked-password-protection
```

#### 確認方法

設定後、Supabaseダッシュボードの **Database > Linter** で警告が解消されていることを確認してください。

#### 参考リンク

- [Supabase Password Security Documentation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [HaveIBeenPwned](https://haveibeenpwned.com/) - パスワード漏洩データベース

### 関数のsearch_path設定

セキュリティ上の理由から、すべてのPostgreSQL関数には`SET search_path = ''`を設定する必要があります。これにより、SQLインジェクション攻撃のリスクを軽減できます。

#### 修正済み関数

以下の関数は`SET search_path = ''`を設定済みです：

- `public.is_admin()`
- `public.get_admin_site_id()`
- `public.set_updated_at()`

新しい関数を作成する際は、必ず`SET search_path = ''`を設定してください。

#### 参考リンク

- [Supabase Function Search Path Documentation](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)

## 参考リンク

- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Database Linter Documentation](https://supabase.com/docs/guides/database/database-linter)

