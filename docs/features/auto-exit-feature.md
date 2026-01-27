# 自動退室機能 実装ガイド

## 概要

開放時間終了時刻を過ぎた未退室ユーザーを自動的に退室させる機能を実装しました。
この機能により、管理者が手動で退室処理を行う必要がなくなります。

---

## 📋 実装内容

### 1. 機能概要

- ✅ 開放時間終了時刻を過ぎた未退室ユーザーを自動検出
- ✅ 自動退室ログの記録
- ✅ 生徒の最終イベント情報の自動更新
- ✅ 個別設定と属性設定の両方に対応
- ✅ 定期実行（Vercel Cron Jobs）
- ✅ 手動実行（APIエンドポイント経由）

### 2. 動作仕様

1. **未退室ユーザーの検出**
   - 在籍中（`status = 'active'`）の生徒
   - 最終イベントが「入室（`entry`）」の生徒
   - 開放時間終了時刻を過ぎている生徒

2. **開放時間の取得**
   - 個別設定がある場合：個別設定を優先
   - 個別設定がない場合：属性に紐づいた開放時間を使用
   - どちらもない場合：デフォルト値（09:00 - 20:00）を使用

3. **自動退室処理**
   - 退室ログ（`access_logs`）を作成
   - 生徒の最終イベント情報を更新
   - デバイスIDは `"auto-exit-system"` として記録

---

## 🔧 セットアップ手順

### 1. 自動退室機能の動作方法

**Vercel無料プラン対応**: 入退室処理のたびに自動的にチェックが実行されます。

- ✅ **追加設定不要**: Vercel Cron設定や外部サービスは不要です
- ✅ **自動実行**: 入退室が発生するたびに、開放時間終了時刻を過ぎた未退室ユーザーを自動的に退室させます
- ✅ **非同期処理**: レスポンス時間への影響を最小限に抑えています

**動作の仕組み**:
1. 生徒が入室または退室する
2. 入退室ログが作成される
3. ログ作成後、非同期で自動退室チェックが実行される
4. 開放時間終了時刻を過ぎた未退室ユーザーが自動的に退室される

**注意**: 
- 入退室が発生しない場合、自動退室チェックは実行されません
- より頻繁にチェックしたい場合は、手動で `/api/auto-exit` を呼び出すか、外部のCronサービスを使用してください

### 2. 環境変数の確認

`.env.local` に以下の環境変数が設定されていることを確認してください：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SITE_ID=your-site-uuid
```

**重要**: `SUPABASE_SERVICE_ROLE_KEY` は必須です（自動退室処理で使用）。

---

## 📝 使用方法

### 自動実行（推奨・デフォルト）

入退室処理のたびに自動的にチェックが実行されます。追加の設定は不要です。

**より頻繁にチェックしたい場合**:
- 外部のCronサービス（例: cron-job.org）を使用して、定期的に `/api/auto-exit` を呼び出すことができます
- Vercel Proプランにアップグレードして、Vercel Cron Jobsを使用することもできます

### 手動実行

#### 1. APIエンドポイントを直接呼び出す

**A. curlコマンド（ターミナル）**
```bash
curl -X POST http://localhost:3001/api/auto-exit \
  -H "Content-Type: application/json"
```

**B. PowerShell（Windows）**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/auto-exit" `
  -Method POST `
  -ContentType "application/json"
```

**C. ブラウザの開発者ツール（Console）**
```javascript
fetch('/api/auto-exit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(res => res.json())
.then(data => console.log(data))
```

#### 2. 自動退室が必要なユーザーを確認（GET）

```bash
curl http://localhost:3001/api/auto-exit
```

**レスポンス例**:
```json
{
  "ok": true,
  "message": "入室中: 5人、自動退室必要: 2人",
  "inBuildingCount": 5,
  "needAutoExitCount": 2,
  "students": [
    {
      "studentId": "uuid",
      "studentName": "山田太郎",
      "endTime": "20:00",
      "lastEventTime": "2024-12-01T18:00:00Z"
    }
  ],
  "currentTime": "2024-12-01T20:15:00Z"
}
```

---

## 🔍 APIエンドポイント詳細

### POST /api/auto-exit

自動退室処理を実行します。

**リクエスト**: なし（Body不要）

**レスポンス**:
```json
{
  "ok": true,
  "message": "3人の自動退室を処理しました",
  "processedCount": 3,
  "totalChecked": 5,
  "students": [
    {
      "studentId": "uuid",
      "studentName": "山田太郎",
      "endTime": "20:00",
      "exited": true
    },
    {
      "studentId": "uuid",
      "studentName": "佐藤花子",
      "endTime": "20:00",
      "exited": false,
      "error": "ログの作成に失敗しました"
    }
  ],
  "timestamp": "2024-12-01T20:15:00Z"
}
```

### GET /api/auto-exit

自動退室が必要なユーザー数を確認します（デバッグ用）。

**レスポンス**:
```json
{
  "ok": true,
  "message": "入室中: 5人、自動退室必要: 2人",
  "inBuildingCount": 5,
  "needAutoExitCount": 2,
  "students": [
    {
      "studentId": "uuid",
      "studentName": "山田太郎",
      "endTime": "20:00",
      "lastEventTime": "2024-12-01T18:00:00Z"
    }
  ],
  "currentTime": "2024-12-01T20:15:00Z"
}
```

---

## 🔒 セキュリティ

### 実装されているセキュリティ機能

1. **Service Role Keyの使用**: サーバー側のみで使用
2. **SITE_IDによる分離**: マルチテナント対応
3. **エラーハンドリング**: 適切なエラーログとレスポンス

### 注意事項

- **SUPABASE_SERVICE_ROLE_KEY** は絶対にクライアント側に公開しないでください
- 本番環境では、Cron Jobsの実行頻度を適切に設定してください
- 大量のユーザーがいる場合、処理時間が長くなる可能性があります

---

## 🐛 トラブルシューティング

### 1. 自動退室が実行されない

**原因**:
- Vercel Cron Jobsが有効になっていない
- `vercel.json` の設定が正しくない
- 環境変数が設定されていない

**対策**:
- VercelダッシュボードでCron Jobsの状態を確認
- `vercel.json` の設定を確認
- 環境変数を確認

### 2. 一部のユーザーが自動退室されない

**原因**:
- 開放時間の設定が正しくない
- 個別設定と属性設定の優先順位が正しくない
- データベースの更新に失敗

**対策**:
- 生徒の開放時間設定を確認
- ログを確認してエラーを特定
- 手動でGETエンドポイントを呼び出して確認

### 3. 処理が遅い

**原因**:
- 大量のユーザーがいる
- データベースのクエリが遅い

**対策**:
- インデックスの確認
- 処理をバッチ化する（将来の拡張）

---

## 📚 関連ファイル

- `app/api/auto-exit/route.ts`: 自動退室処理API
- `lib/access-time-utils.ts`: 開放時間取得ヘルパー関数
- `vercel.json`: Vercel Cron Jobs設定
- `migrations/create_role_based_access_times_table.sql`: 属性ごとの開放時間テーブル
- `migrations/add_individual_access_times_to_students.sql`: 個別開放時間カラム

---

## 🚀 今後の拡張案

1. **通知機能**: 自動退室時に保護者に通知を送信
2. **統計情報**: 自動退室の回数や傾向を表示
3. **設定画面**: 管理画面から自動退室のスケジュールを変更
4. **バッチ処理**: 大量のユーザーを効率的に処理
5. **ログ管理**: 自動退室の履歴を管理画面で表示

---

**最終更新**: 2024年12月  
**バージョン**: 1.0.0





