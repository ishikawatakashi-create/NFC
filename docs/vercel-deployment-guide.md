# Vercelデプロイガイド

## 概要

このドキュメントでは、NFCカード管理システムをVercelにデプロイする手順と、よくある問題の解決方法を説明します。

---

## デプロイ前の確認事項

### 1. ローカルビルドの確認

デプロイ前に、ローカルでビルドが成功することを確認してください：

```bash
npm run build
```

ビルドが成功することを確認したら、次に進みます。

### 2. 環境変数の準備

Vercelにデプロイする前に、以下の環境変数を準備してください：

#### 必須環境変数

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SITE_ID=your-site-uuid
```

#### オプション環境変数（機能を使用する場合）

```env
# LINE通知機能を使用する場合
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
```

---

## Vercelへのデプロイ手順

### 方法1: Vercel CLIを使用（推奨）

1. **Vercel CLIをインストール**
   ```bash
   npm i -g vercel
   ```

2. **Vercelにログイン**
   ```bash
   vercel login
   ```

3. **プロジェクトをデプロイ**
   ```bash
   vercel
   ```

4. **本番環境にデプロイ**
   ```bash
   vercel --prod
   ```

### 方法2: GitHub連携を使用

1. **GitHubリポジトリにプッシュ**
   - プロジェクトをGitHubリポジトリにプッシュします

2. **Vercelダッシュボードでプロジェクトをインポート**
   - https://vercel.com/dashboard にアクセス
   - 「Add New...」→「Project」をクリック
   - GitHubリポジトリを選択
   - 「Import」をクリック

3. **環境変数を設定**
   - プロジェクト設定画面で「Environment Variables」を開く
   - 以下の環境変数を追加：
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `SITE_ID`
     - `LINE_CHANNEL_ACCESS_TOKEN`（使用する場合）

4. **デプロイ**
   - 「Deploy」をクリック

---

## 環境変数の設定方法

### Vercelダッシュボードで設定

1. **プロジェクトを開く**
   - Vercelダッシュボードでプロジェクトを選択

2. **Settings → Environment Variables を開く**

3. **環境変数を追加**
   - 「Add New」をクリック
   - 変数名と値を入力
   - 環境（Production, Preview, Development）を選択
   - 「Save」をクリック

4. **再デプロイ**
   - 環境変数を追加・変更した後は、再デプロイが必要です
   - 「Deployments」タブから最新のデプロイを選択
   - 「Redeploy」をクリック

### Vercel CLIで設定

```bash
# 環境変数を追加
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add SITE_ID

# 環境変数を確認
vercel env ls
```

---

## よくある問題と解決方法

### 問題1: ビルドエラーが発生する

**症状**: デプロイ時にビルドエラーが発生する

**原因と解決方法**:

1. **Node.jsバージョンの不一致**
   - `package.json`で指定されているNode.jsバージョン（`>=18.0.0`）を確認
   - Vercelのプロジェクト設定でNode.jsバージョンを確認
   - Settings → General → Node.js Version で `18.x` または `20.x` を選択

2. **依存関係の問題**
   - ローカルで `npm install` を実行して問題がないか確認
   - `package-lock.json` が最新であることを確認

3. **TypeScriptエラー**
   - ローカルで `npm run build` を実行してエラーを確認
   - `next.config.mjs` で `ignoreBuildErrors: true` が設定されている場合、実際のエラーを確認

### 問題2: 環境変数が読み込まれない

**症状**: デプロイ後、環境変数が正しく読み込まれていない

**解決方法**:

1. **環境変数の設定を確認**
   - Vercelダッシュボードで環境変数が正しく設定されているか確認
   - 環境（Production/Preview/Development）が正しく選択されているか確認

2. **環境変数の命名規則を確認**
   - `NEXT_PUBLIC_` で始まる変数はクライアント側でも使用可能
   - それ以外の変数はサーバー側でのみ使用可能

3. **再デプロイ**
   - 環境変数を追加・変更した後は、必ず再デプロイが必要です

4. **環境チェックページで確認**
   - `/envcheck` にアクセスして、環境変数が正しく読み込まれているか確認

### 問題3: APIルートが404エラーを返す

**症状**: APIエンドポイントにアクセスすると404エラーが返る

**解決方法**:

1. **ルーティングの確認**
   - `app/api/` ディレクトリ内のファイル構造を確認
   - `route.ts` ファイルが正しく配置されているか確認

2. **ビルドログの確認**
   - Vercelのデプロイログで、APIルートが正しく認識されているか確認
   - ビルドログに `ƒ /api/xxx` と表示されているか確認

### 問題4: 自動退室機能（Cron）が動作しない

**症状**: 自動退室機能が実行されない

**解決方法**:

1. **vercel.jsonの確認**
   - `vercel.json` にCron設定が正しく記述されているか確認
   - スケジュールが正しい形式（cron形式）であるか確認

2. **Vercel Proプランの確認**
   - Cron機能はVercel Proプラン以上で利用可能です
   - 無料プランの場合は、外部のCronサービス（例: cron-job.org）を使用する必要があります

3. **APIエンドポイントの確認**
   - `/api/auto-exit` が正しく動作するか確認
   - 手動でAPIエンドポイントにアクセスして動作を確認

### 問題5: Supabase接続エラー

**症状**: Supabaseへの接続が失敗する

**解決方法**:

1. **環境変数の確認**
   - `NEXT_PUBLIC_SUPABASE_URL` が正しく設定されているか確認
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` が正しく設定されているか確認
   - `SUPABASE_SERVICE_ROLE_KEY` が正しく設定されているか確認（サーバー側の操作に必要）

2. **Supabaseプロジェクトの確認**
   - Supabaseプロジェクトがアクティブであるか確認
   - APIキーが有効であるか確認

3. **ネットワークの確認**
   - VercelからSupabaseへの接続がブロックされていないか確認
   - Supabaseのダッシュボードで接続ログを確認

---

## デプロイ後の確認

### 1. ヘルスチェック

デプロイ後、以下のエンドポイントにアクセスして動作を確認：

- **ヘルスチェック**: `https://your-domain.vercel.app/api/health`
- **環境チェック**: `https://your-domain.vercel.app/envcheck`

### 2. 主要ページの確認

- **トップページ**: `https://your-domain.vercel.app/`
- **管理画面ログイン**: `https://your-domain.vercel.app/admin/login`
- **キオスク入室画面**: `https://your-domain.vercel.app/kiosk/entry`

### 3. APIエンドポイントの確認

主要なAPIエンドポイントが正しく動作するか確認：

- `GET /api/health`
- `GET /api/students`
- `GET /api/admin/check`

---

## トラブルシューティングのチェックリスト

デプロイに問題がある場合、以下を順番に確認してください：

- [ ] ローカルで `npm run build` が成功するか
- [ ] `package.json` の `engines.node` が正しく設定されているか
- [ ] すべての必須環境変数がVercelに設定されているか
- [ ] 環境変数の値が正しいか（タイポ、余分なスペースなど）
- [ ] Vercelのデプロイログにエラーがないか
- [ ] Node.jsバージョンが正しく設定されているか
- [ ] 依存関係が正しくインストールされているか
- [ ] `vercel.json` の設定が正しいか

---

## 参考リンク

- [Vercel公式ドキュメント](https://vercel.com/docs)
- [Next.js公式ドキュメント](https://nextjs.org/docs)
- [Supabase公式ドキュメント](https://supabase.com/docs)

---

**最終更新**: 2024年





