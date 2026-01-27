# ポイント機能 デバッグガイド

## 🔍 問題の確認方法

### 1. ブラウザの開発者ツールで確認

1. **F12キー**を押して開発者ツールを開く
2. **Consoleタブ**を開く
3. ポイント追加・削除操作を実行
4. エラーメッセージを確認

### 2. ネットワークタブで確認

1. **Networkタブ**を開く
2. ポイント追加・削除操作を実行
3. `/api/points/add` または `/api/points/consume` のリクエストを確認
4. レスポンスのステータスコードと内容を確認

### 3. サーバーログで確認

開発サーバーのコンソールで以下のログを確認：
- `[Points]` で始まるログ
- `[Points API]` で始まるログ
- エラーメッセージ

## 🐛 よくある問題と対処法

### 問題1: RPC関数が存在しない

**症状**: エラーログに `PGRST116` または `function does not exist` が表示される

**対処法**:
1. `migrations/create_point_transaction_rpc.sql` を実行しているか確認
2. SupabaseのSQL Editorで以下を実行して確認：
   ```sql
   SELECT proname FROM pg_proc WHERE proname IN ('add_points_transaction', 'subtract_points_transaction');
   ```

### 問題2: 認証エラー

**症状**: `認証が必要です` というエラーが表示される

**対処法**:
1. 管理画面にログインしているか確認
2. ブラウザのCookieを確認
3. `/api/admin/check` にアクセスして認証状態を確認

### 問題3: データベース制約エラー

**症状**: 外部キー制約エラーが表示される

**対処法**:
1. `migrations/add_admin_id_to_point_transactions.sql` を実行しているか確認
2. `admins` テーブルに管理者が存在するか確認

### 問題4: ポイントが反映されない

**症状**: 操作は成功するが、画面に反映されない

**対処法**:
1. ブラウザをリロード（F5）
2. データベースで直接確認：
   ```sql
   SELECT id, name, current_points FROM students WHERE id = '対象の生徒ID';
   SELECT * FROM point_transactions WHERE student_id = '対象の生徒ID' ORDER BY created_at DESC LIMIT 5;
   ```

## 📝 デバッグ用SQLクエリ

### ポイント履歴の確認
```sql
SELECT 
  pt.id,
  pt.transaction_type,
  pt.points,
  pt.description,
  pt.created_at,
  pt.admin_id,
  s.name as student_name,
  a.first_name || ' ' || a.last_name as admin_name
FROM point_transactions pt
LEFT JOIN students s ON pt.student_id = s.id
LEFT JOIN admins a ON pt.admin_id = a.id
WHERE pt.student_id = '対象の生徒ID'
ORDER BY pt.created_at DESC
LIMIT 10;
```

### ポイント整合性の確認
```sql
SELECT 
  s.id,
  s.name,
  s.current_points as stored_points,
  COALESCE(SUM(pt.points), 0) as calculated_points,
  s.current_points - COALESCE(SUM(pt.points), 0) as difference
FROM students s
LEFT JOIN point_transactions pt ON s.id = pt.student_id
WHERE s.role = 'student'
GROUP BY s.id, s.name, s.current_points
HAVING s.current_points != COALESCE(SUM(pt.points), 0);
```

### RPC関数の確認
```sql
-- RPC関数が存在するか確認
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname IN ('add_points_transaction', 'subtract_points_transaction');
```

## 🔧 トラブルシューティング手順

1. **ブラウザのコンソールを確認**
   - エラーメッセージを確認
   - ネットワークタブでAPIレスポンスを確認

2. **サーバーログを確認**
   - 開発サーバーのコンソールでエラーログを確認
   - `[Points]` で始まるログを確認

3. **データベースを直接確認**
   - 上記のSQLクエリを実行
   - データが正しく保存されているか確認

4. **マイグレーションを確認**
   - すべてのマイグレーションが実行されているか確認
   - RPC関数が存在するか確認
