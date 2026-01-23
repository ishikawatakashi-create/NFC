# セキュリティ修正: RLS有効化とsearch_path設定

## 📋 修正概要

Supabaseのセキュリティ警告に対応し、以下の修正を実施しました：

1. **RLS（Row Level Security）有効化**: `point_settings`と`line_followers`テーブル
2. **search_path設定**: `add_points_transaction`と`subtract_points_transaction`関数
3. **コード修正**: `lib/point-settings-utils.ts`をサービスロールキー使用に変更

---

## 🔴 修正内容（最優先）

### 1. RLS有効化: `point_settings`テーブル

**問題点:**
- RLSが無効でPostgRESTを通じて誰でもアクセスできる状態
- ポイント設定が不正に変更されるリスク

**修正内容:**
```sql
ALTER TABLE public.point_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage point_settings" ON public.point_settings
  FOR ALL
  USING (
    public.is_admin()
    AND site_id = public.get_admin_site_id()
  )
  WITH CHECK (
    public.is_admin()
    AND site_id = public.get_admin_site_id()
  );
```

**影響範囲:**
- ✅ API routes（`app/api/point-settings/route.ts`）: サービスロールキー使用のため影響なし
- ✅ ライブラリ（`lib/point-settings-utils.ts`）: サービスロールキー使用に変更済みのため影響なし

---

### 2. RLS有効化: `line_followers`テーブル

**問題点:**
- RLSが無効でPostgRESTを通じて誰でもアクセスできる状態
- LINE友だち情報が漏洩するリスク

**修正内容:**
```sql
ALTER TABLE public.line_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage line_followers" ON public.line_followers
  FOR ALL
  USING (
    public.is_admin()
    AND site_id = public.get_admin_site_id()
  )
  WITH CHECK (
    public.is_admin()
    AND site_id = public.get_admin_site_id()
  );
```

**影響範囲:**
- ✅ API routes（`app/api/line/followers/route.ts`）: サービスロールキー使用のため影響なし
- ✅ Webhook（`app/api/line/webhook/route.ts`）: サービスロールキー使用のため影響なし

---

## 🟡 修正内容（推奨）

### 3. search_path設定: RPC関数

**問題点:**
- `add_points_transaction`と`subtract_points_transaction`関数で`search_path`が設定されていない
- 悪意のあるユーザーが`search_path`を操作する可能性（セキュリティリスク）

**修正内容:**
```sql
CREATE OR REPLACE FUNCTION add_points_transaction(...)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- 追加
AS $$ ... $$;

CREATE OR REPLACE FUNCTION subtract_points_transaction(...)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- 追加
AS $$ ... $$;
```

**影響範囲:**
- ✅ ポイント機能（`lib/point-utils.ts`）: 既存の動作を変えず、より安全にするだけ
- ✅ 全API: 動作に影響なし

---

## 🔧 コード修正

### lib/point-settings-utils.ts

**変更前:**
```typescript
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // アノニマスキー
  );
}
```

**変更後:**
```typescript
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function getSupabase() {
  // サービスロールキーを使用してRLSをバイパス
  // ポイント設定の取得は常にサーバーサイドで行われるため安全
  return getSupabaseAdmin();
}
```

**理由:**
- `getPointSettings`は`app/api/access-logs/route.ts`（サーバーサイド）でのみ使用
- RLS有効化後、アノニマスキーではアクセスできなくなるため
- サーバーサイド専用のため、サービスロールキー使用は安全

---

## 📦 マイグレーションファイル

### migrations/fix_rls_and_search_path_security.sql

以下の内容で作成済み：
1. `point_settings`テーブルのRLS有効化とポリシー設定
2. `line_followers`テーブルのRLS有効化とポリシー設定
3. `add_points_transaction`関数のsearch_path設定
4. `subtract_points_transaction`関数のsearch_path設定

---

## ✅ 動作確認チェックリスト

修正後、以下を確認してください：

### 1. ポイント設定機能
- [ ] ポイント設定画面が正常に表示される
- [ ] ポイント設定の変更が正常に保存される
- [ ] 入室時のポイント付与が正常に動作する

### 2. LINE友だち機能
- [ ] LINE友だち一覧が正常に表示される
- [ ] LINEWebhookが正常に動作する
- [ ] 友だち追加・解除が正常に記録される

### 3. ポイント機能
- [ ] ポイント付与が正常に動作する
- [ ] ポイント減算が正常に動作する
- [ ] ポイント履歴が正常に記録される
- [ ] 一括操作が正常に動作する

---

## 🔍 影響を受けるファイル

### 修正ファイル
- ✏️ `migrations/fix_rls_and_search_path_security.sql` (新規作成)
- ✏️ `lib/point-settings-utils.ts` (サービスロールキー使用に変更)
- 📄 `docs/security-fix-rls-search-path.md` (このドキュメント)

### 影響を受けるが修正不要なファイル
- ✅ `app/api/point-settings/route.ts` (既にサービスロールキー使用)
- ✅ `app/api/line/followers/route.ts` (既にサービスロールキー使用)
- ✅ `app/api/line/webhook/route.ts` (既にサービスロールキー使用)
- ✅ `lib/point-utils.ts` (既にサービスロールキー使用)

---

## 🚀 適用手順

### 1. マイグレーション実行

Supabase Dashboard > SQL Editor で以下を実行：

```sql
-- migrations/fix_rls_and_search_path_security.sql の内容をコピー＆ペースト
```

または、Supabase CLIを使用：

```bash
supabase migration up
```

### 2. アプリケーションの再起動

```bash
# 開発環境の場合
npm run dev

# 本番環境の場合（Vercelなど）
# 再デプロイまたは自動デプロイ
```

### 3. 動作確認

上記のチェックリストに従って動作確認を実施

---

## 📊 セキュリティ改善効果

### 修正前
| 項目 | 状態 | リスク |
|------|------|--------|
| point_settings RLS | ❌ 無効 | 🔴 高 |
| line_followers RLS | ❌ 無効 | 🔴 高 |
| RPC search_path | ❌ 未設定 | 🟡 中 |

### 修正後
| 項目 | 状態 | リスク |
|------|------|--------|
| point_settings RLS | ✅ 有効 | ✅ 低 |
| line_followers RLS | ✅ 有効 | ✅ 低 |
| RPC search_path | ✅ 設定済み | ✅ 低 |

---

## ⚠️ 注意事項

### 1. サービスロールキーの取り扱い

`lib/point-settings-utils.ts`がサービスロールキーを使用するため：
- ✅ サーバーサイド（API routes）でのみ使用可能
- ❌ クライアントサイドでは絶対に使用しない
- ✅ 現在の使用箇所（`app/api/access-logs/route.ts`）はサーバーサイドのため問題なし

### 2. 無料枠への影響

- ✅ **影響なし**: RLSやsearch_path設定は計算リソースやストレージを増やさない
- ✅ **APIコール数**: 変化なし
- ✅ **パフォーマンス**: ほぼ変化なし（RLSのチェックは軽量）

### 3. 既存データへの影響

- ✅ **データ損失なし**: RLS有効化はデータに影響を与えない
- ✅ **既存のアクセス権限**: サービスロールキー使用のため影響なし

---

## 🔗 関連ドキュメント

- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [PostgreSQL search_path Security](https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH)
- [Supabase Database Linter](https://supabase.com/docs/guides/database/database-linter)

---

## 📝 変更履歴

| 日付 | 変更内容 |
|------|----------|
| 2026-01-16 | 初版作成 - RLS有効化とsearch_path設定 |
