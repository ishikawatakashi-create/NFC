# Vercel Cron設定の問題と解決方法

## 問題

コミット `c78333a` で `vercel.json` にCron設定が追加されましたが、VercelのCron機能は**Vercel Proプラン以上**で利用可能です。

無料プラン（Hobbyプラン）の場合、Cron設定があるとデプロイが失敗する可能性があります。

## 解決方法

### 方法1: Cron設定を削除（無料プランの場合）

無料プランを使用している場合、`vercel.json` からCron設定を削除してください：

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

### 方法2: 外部のCronサービスを使用（無料プランの場合）

無料プランを使用している場合、外部のCronサービス（例: cron-job.org、EasyCron）を使用して `/api/auto-exit` を定期的に呼び出すことができます。

### 方法3: Vercel Proプランにアップグレード

Cron機能を使用する場合は、Vercel Proプランにアップグレードしてください。

## 確認方法

1. **Vercelダッシュボードでプランを確認**
   - Settings → General → Plan で現在のプランを確認

2. **デプロイログを確認**
   - Deployments タブで最新のデプロイログを確認
   - Cron設定に関するエラーメッセージがないか確認

## 自動退室機能の代替案

Cron機能が使用できない場合、以下の代替案があります：

1. **外部のCronサービスを使用**
   - cron-job.org などの無料Cronサービスを使用
   - 5分ごとに `https://your-domain.vercel.app/api/auto-exit` を呼び出す

2. **クライアント側で定期的にチェック**
   - 管理画面を開いている間、クライアント側で定期的にAPIを呼び出す
   - （推奨されませんが、一時的な解決策として）

3. **SupabaseのCron機能を使用**
   - SupabaseのCron機能（pg_cron）を使用して、データベース側で処理を実行

---

**注意**: この問題が原因でデプロイが失敗している場合は、`vercel.json` からCron設定を削除してから再デプロイしてください。



