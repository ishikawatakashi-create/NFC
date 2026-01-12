# Vercelログ確認ガイド

## 概要

このドキュメントでは、Vercelにデプロイされたアプリケーションのログを確認する方法を説明します。
データベース操作（DELETE、UPDATEなど）を誰が実行したかを追跡するために、ログを確認します。

---

## Vercelダッシュボードでログを確認する方法

### 1. Vercelダッシュボードにアクセス

1. **Vercelダッシュボードにログイン**
   - https://vercel.com/dashboard にアクセス
   - デプロイURLが共有されているアカウントでログイン

2. **プロジェクトを選択**
   - プロジェクト名: `nfc-toukalab`（または該当するプロジェクト名）
   - または、URL: `https://nfc-toukalab.vercel.app` からプロジェクトを特定

### 2. デプロイメントログの確認

1. **Deploymentsタブを開く**
   - 左サイドバーから「Deployments」をクリック

2. **最新のデプロイメントを選択**
   - リストから最新のデプロイメントをクリック

3. **ログを確認**
   - 「Functions」タブを開く
   - 各APIエンドポイントのログを確認
   - 特に `/api/students` のDELETE操作のログを確認

### 3. リアルタイムログの確認

1. **Functionsタブを開く**
   - プロジェクトの「Functions」タブを開く

2. **ログストリームを確認**
   - リアルタイムでログが表示されます
   - フィルター機能で特定のエンドポイントや時間帯を絞り込めます

### 4. ログの検索方法

1. **時間範囲で絞り込む**
   - ログの上部に時間範囲のフィルターがあります
   - データが削除されたと思われる時間帯を指定

2. **エンドポイントで絞り込む**
   - `/api/students` のDELETE操作を検索
   - 検索ボックスに `DELETE` や `students` と入力

3. **エラーログを確認**
   - エラーログのみを表示するフィルターを使用

---

## 確認すべきログの内容

### 1. DELETE操作のログ

以下のようなログが記録されているはずです：

```
[AccessLogs] POST request received
[AccessLogs] Request data: studentId=xxx, eventType=entry
```

または、DELETE操作の場合：

```
DELETE /api/students?id=xxx
```

### 2. 管理者情報のログ

現在の実装では、DELETE操作時に管理者情報をログに記録していませんが、
認証情報は以下のように確認できます：

- リクエストヘッダーに含まれる認証トークン
- セッション情報

### 3. エラーログ

エラーが発生した場合、以下のようなログが記録されます：

```
[AccessLogs] Failed to fetch student xxx: ...
[AccessLogs] Failed to create log: ...
```

---

## ログから削除操作を特定する方法

### 1. 時間範囲を絞り込む

データが削除されたと思われる時間帯を特定し、その時間帯のログを確認します。

### 2. DELETEリクエストを検索

ログ検索で以下のキーワードで検索：
- `DELETE`
- `/api/students`
- `studentId`
- `id=`

### 3. エラーログを確認

削除操作が失敗した場合、エラーログに記録されます。

---

## 注意事項

### ログの保持期間

- **Vercel無料プラン**: ログは7日間保持されます
- **Vercel Proプラン**: ログは30日間保持されます

### ログの制限

- 大量のリクエストがある場合、すべてのログが表示されない可能性があります
- ログの検索機能には制限があります

---

## 今後の改善案

### 監査ログ機能の追加

現在の実装では、DELETE操作を誰が実行したかを記録していません。
以下の機能を追加することを推奨します：

1. **audit_logsテーブルの作成**
   - 操作種別（DELETE、UPDATE、INSERTなど）
   - 実行した管理者のID
   - 操作対象のテーブルとレコードID
   - 操作日時
   - 操作前後のデータ（オプション）

2. **APIエンドポイントに監査ログ記録を追加**
   - 各DELETE/UPDATE操作時に自動記録
   - 管理者情報を取得して記録

---

## 参考リンク

- [Vercel Logs Documentation](https://vercel.com/docs/observability/logs)
- [Vercel Functions Logs](https://vercel.com/docs/observability/functions-logs)

---

**最終更新**: 2024年





