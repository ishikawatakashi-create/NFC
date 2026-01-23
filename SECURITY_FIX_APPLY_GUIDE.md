# セキュリティ修正 適用ガイド

## 🎯 修正内容

Supabaseのセキュリティ警告（RLS無効、search_path未設定）を修正しました。

### 修正項目
- ✅ `point_settings`テーブルのRLS有効化
- ✅ `line_followers`テーブルのRLS有効化
- ✅ RPC関数の`search_path`設定（`add_points_transaction`, `subtract_points_transaction`）
- ✅ `lib/point-settings-utils.ts`の修正（サービスロールキー使用）

---

## 📋 適用手順

### ステップ1: マイグレーション実行

Supabase Dashboard（https://supabase.com）にアクセスし、以下の手順で実行してください：

1. プロジェクトを開く
2. 左メニューから **SQL Editor** を選択
3. **New Query** をクリック
4. 以下のファイルの内容をコピー＆ペースト：
   ```
   migrations/fix_rls_and_search_path_security.sql
   ```
5. **Run** ボタンをクリック
6. 成功メッセージを確認

**実行結果例:**
```
NOTICE: RLS enabled for point_settings table
NOTICE: RLS enabled for line_followers table
NOTICE: ========================================
NOTICE: セキュリティ修正が完了しました:
NOTICE: 1. point_settings テーブルのRLS有効化
NOTICE: 2. line_followers テーブルのRLS有効化とポリシー追加
NOTICE: 3. add_points_transaction 関数のsearch_path設定
NOTICE: 4. subtract_points_transaction 関数のsearch_path設定
NOTICE: ========================================
```

### ステップ2: アプリケーションの再起動（不要）

コード修正は既に反映済みのため、再起動は不要です。

---

## ✅ 動作確認

以下の機能が正常に動作することを確認してください：

### 1. ポイント設定
- [ ] 管理画面 > ポイント設定 が開ける
- [ ] ポイント設定が保存できる
- [ ] 入室時のポイント付与が動作する

### 2. LINE通知
- [ ] LINE友だち一覧が表示される
- [ ] 入退室時のLINE通知が送信される

### 3. ポイント機能
- [ ] ポイントの付与が動作する
- [ ] ポイントの減算が動作する
- [ ] ポイント履歴が表示される

---

## ❌ もし問題が発生した場合

### エラー: "permission denied for table point_settings"

**原因:** RLSが有効になったが、ポリシーが正しく設定されていない

**対処:**
1. Supabase Dashboard > SQL Editor で以下を実行：
   ```sql
   SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('point_settings', 'line_followers');
   ```
2. ポリシーが存在することを確認
3. 存在しない場合は、マイグレーションを再実行

### エラー: "function does not exist"

**原因:** RPC関数が正しく更新されていない

**対処:**
1. Supabase Dashboard > SQL Editor で以下を実行して確認：
   ```sql
   SELECT proname, prosrc FROM pg_proc WHERE proname IN ('add_points_transaction', 'subtract_points_transaction');
   ```
2. 関数が存在しない場合は、マイグレーションを再実行

---

## 📊 修正前後の比較

### Supabaseセキュリティ警告

| 警告項目 | 修正前 | 修正後 |
|---------|--------|--------|
| `point_settings` RLS | ❌ ERROR | ✅ 解消 |
| `line_followers` RLS | ❌ ERROR | ✅ 解消 |
| `add_points_transaction` search_path | ⚠️ WARN | ✅ 解消 |
| `subtract_points_transaction` search_path | ⚠️ WARN | ✅ 解消 |

---

## 🔐 セキュリティ改善効果

### 修正前
- ❌ PostgRESTを通じて誰でも`point_settings`にアクセス可能（ポイント設定の不正変更リスク）
- ❌ PostgRESTを通じて誰でも`line_followers`にアクセス可能（LINE友だち情報の漏洩リスク）
- ⚠️ RPC関数の`search_path`が未設定（セキュリティリスク）

### 修正後
- ✅ 管理者のみが`point_settings`にアクセス可能
- ✅ 管理者のみが`line_followers`にアクセス可能
- ✅ RPC関数の`search_path`が適切に設定

---

## 📝 修正ファイル一覧

### 新規作成
- `migrations/fix_rls_and_search_path_security.sql`
- `docs/security-fix-rls-search-path.md`（詳細ドキュメント）
- `SECURITY_FIX_APPLY_GUIDE.md`（このファイル）

### 修正
- `lib/point-settings-utils.ts`（サービスロールキー使用に変更）

---

## 💡 よくある質問

**Q: 無料枠に影響はありますか？**
A: いいえ、影響ありません。RLSやsearch_path設定はリソース消費を増やしません。

**Q: 既存データに影響はありますか？**
A: いいえ、影響ありません。RLS有効化はデータを変更しません。

**Q: 既存の機能は動作しますか？**
A: はい、全て動作します。全ての使用箇所でサービスロールキーを使用しているため影響ありません。

**Q: 社内運用でもこの修正は必要ですか？**
A: はい、推奨します。セキュリティのベストプラクティスとして、RLS有効化は重要です。

---

## 📞 問題が解決しない場合

詳細ドキュメントを参照してください：
- `docs/security-fix-rls-search-path.md`

または、以下を確認してください：
1. Supabase Dashboardのログ（左メニュー > Logs）
2. ブラウザのコンソールログ（F12キー）
3. サーバーのログ（ターミナル）

---

**適用日:** 2026-01-16  
**バージョン:** 1.0.0
