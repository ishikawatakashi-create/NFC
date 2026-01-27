# LINE Webhook QRコード画像表示・URL問題の修正ガイド

## 🚨 問題

1. **QRコード画像が表示されない**
   - LINE公式アカウントに「紐づけ」と送信すると、QRコード画像が表示されない
   - 画像プレースホルダーが表示される

2. **URLをクリックするとVercelのログイン画面になる**
   - 返信されたURLをクリックすると、Vercelのログイン画面に遷移してしまう
   - 親御さんはログインできない

## 🔍 原因

1. **プレビュー環境のURLが使われている**
   - `VERCEL_URL`環境変数はプレビュー環境のURL（例: `nfctoukalab-jwtcfij7s-takashi-ishikawas-projects.vercel.app`）を返す
   - プレビュー環境は認証が必要な場合があるため、LINEからアクセスできない

2. **`NEXT_PUBLIC_BASE_URL`が設定されていない**
   - 本番環境のURLが設定されていないため、プレビュー環境のURLが使われている

## ✅ 解決方法

### ステップ1: Vercelの環境変数に`NEXT_PUBLIC_BASE_URL`を設定

1. **Vercelダッシュボードにアクセス**
   - https://vercel.com/dashboard
   - プロジェクトを選択

2. **Settings → Environment Variables を開く**

3. **環境変数を追加**
   - **Key**: `NEXT_PUBLIC_BASE_URL`
   - **Value**: 本番環境のURL（例: `https://nfctoukalab.vercel.app` またはカスタムドメイン）
   - **Environment**: Production, Preview, Development すべてにチェック
   - 「Save」をクリック

4. **再デプロイ**
   - 「Deployments」タブを開く
   - 最新のデプロイを選択
   - 「Redeploy」をクリック

### ステップ2: 本番環境のURLを確認

本番環境のURLは以下のいずれかです：

- **VercelのデフォルトURL**: `https://[プロジェクト名].vercel.app`
- **カスタムドメイン**: 設定している場合はそのドメイン

**確認方法:**
1. Vercelダッシュボード → プロジェクト → Settings → Domains
2. 本番環境のURLを確認

### ステップ3: 動作確認

1. LINE公式アカウントに「紐づけ」とメッセージを送信
2. QRコード画像が正しく表示されることを確認
3. URLをクリックして、正しいページに遷移することを確認

## 📝 注意事項

### LINE Messaging APIのImage Message要件

LINE Messaging APIのImage Messageには、以下の要件があります：

1. **HTTPS必須**: URLはHTTPSで始まる必要がある
2. **公開アクセス可能**: 認証やファイアウォールで保護されていない必要がある
3. **画像形式**: JPEGまたはPNG形式
4. **ファイルサイズ**: 最大10MB

### プレビュー環境のURLについて

- プレビュー環境のURL（`-xxx-xxx.vercel.app`）は認証が必要な場合がある
- 本番環境のURL（`xxx.vercel.app`）は公開アクセス可能
- 必ず`NEXT_PUBLIC_BASE_URL`に本番環境のURLを設定してください

## 🐛 トラブルシューティング

### 問題1: QRコード画像がまだ表示されない

**確認事項:**
1. `NEXT_PUBLIC_BASE_URL`が正しく設定されているか
2. 本番環境のURLが正しいか
3. Vercelのログでエラーが発生していないか

**解決方法:**
- Vercelのログを確認（Deployments → 最新のデプロイ → Functions → `/api/line/webhook`）
- QRコード画像のURLが正しく生成されているか確認
- ブラウザでQRコード画像のURLに直接アクセスして、画像が表示されるか確認

### 問題2: URLをクリックしてもVercelのログイン画面になる

**確認事項:**
1. `NEXT_PUBLIC_BASE_URL`が本番環境のURLになっているか
2. プレビュー環境のURLが使われていないか

**解決方法:**
- `NEXT_PUBLIC_BASE_URL`を本番環境のURLに設定
- 再デプロイして確認

## 📚 関連ドキュメント

- `docs/line-webhook-setup-guide.md` - Webhook設定ガイド
- `docs/line-webhook-quick-setup.md` - クイックセットアップガイド

---

**最終更新**: 2026-01-26
