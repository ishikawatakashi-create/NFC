# NFCカード開発システム

ロボ団一宮校のNFCカードを使用した入退室管理システムです。

## 📋 機能概要

- **入退室管理**: NFCカードタッチによる入退室記録
- **生徒管理**: 生徒情報の登録・編集・削除
- **ポイントシステム**: 入室時のポイント付与・ボーナスポイント
- **LINE通知**: 保護者への入退室通知（LINE Messaging API）
- **自動退室**: 開放時間終了後の自動退室処理
- **管理画面**: 生徒情報、ポイント、アクセスログの管理

## 🚀 クイックスタート

### 1. 環境変数の設定

`.env.local.example` ファイルを `.env.local` にコピーして、必要な環境変数を設定してください。

```bash
cp .env.local.example .env.local
```

必須の環境変数：
- `NEXT_PUBLIC_SUPABASE_URL`: SupabaseプロジェクトのURL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anon Key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key
- `SITE_ID`: サイト識別子

詳細は `.env.local.example` を参照してください。

### 2. 依存関係のインストール

```bash
npm install
```

### 3. データベースのマイグレーション

Supabaseプロジェクトに `migrations/` フォルダ内のSQLファイルを実行してください。

### 4. 開発サーバーの起動

```bash
npm run dev
```

アプリケーションは http://localhost:3001 で起動します。

## 📁 プロジェクト構造

```
NFC/
├── app/                    # Next.js App Router
│   ├── admin/             # 管理画面
│   ├── api/               # APIエンドポイント
│   ├── kiosk/             # キオスク端末画面
│   └── ...
├── components/            # Reactコンポーネント
│   ├── admin/            # 管理画面用コンポーネント
│   └── ui/               # UIコンポーネント（shadcn/ui）
├── lib/                   # ユーティリティ関数
│   ├── env.ts            # 環境変数管理
│   ├── supabaseAdmin.ts  # Supabase管理クライアント
│   ├── point-utils.ts    # ポイント処理
│   ├── line-notification-utils.ts  # LINE通知
│   └── ...
├── migrations/            # データベースマイグレーション
├── docs/                  # ドキュメント
└── public/               # 静的ファイル
```

## 🔧 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **言語**: TypeScript
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth
- **UIライブラリ**: shadcn/ui + Radix UI
- **スタイリング**: Tailwind CSS
- **デプロイ**: Vercel

## 📱 主要な機能

### キオスク端末（入退室）
- `/kiosk/entry` - 入口側（入室記録）
- `/kiosk/exit` - 出口側（退室記録）

### 管理画面
- `/admin/students` - 生徒管理
- `/admin/points` - ポイント管理
- `/admin/access-logs` - アクセスログ
- `/admin/settings` - システム設定

### API
- `/api/access-logs` - 入退室ログ
- `/api/students` - 生徒管理
- `/api/points/*` - ポイント処理
- `/api/line/webhook` - LINE Webhook

## 🔐 セキュリティ

### 環境変数の管理
- 機密情報は `.env.local` に保存（Gitにはコミットされません）
- `lib/env.ts` で環境変数を型安全に管理
- アプリケーション起動時に環境変数を検証

### API認証
- Kiosk API: `KIOSK_API_SECRET` による認証
- 管理画面: Supabase Authによるセッション管理
- LINE Webhook: 署名検証

### データベース
- Row Level Security (RLS) を使用
- サイトID (`SITE_ID`) によるデータ分離

## 📚 ドキュメント

詳細なドキュメントは `docs/` フォルダを参照してください。

- [LINE連携セットアップガイド](docs/line-notification-setup-guide.md)
- [ポイントシステム実装概要](docs/point-system-implementation-summary.md)
- [本番環境デプロイガイド](docs/vercel-deployment-guide.md)
- [セキュリティ対策まとめ](docs/security-fix-summary.md)

## 🛠️ 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# 本番サーバー起動
npm start

# リントチェック
npm run lint
```

## 📦 デプロイ

Vercelへのデプロイを推奨します。

1. Vercelプロジェクトを作成
2. 環境変数を設定（`.env.local.example` を参照）
3. GitHubリポジトリと連携してデプロイ

詳細は [Vercelデプロイガイド](docs/vercel-deployment-guide.md) を参照してください。

## 🤝 貢献

プロジェクトへの貢献を歓迎します。

## 📄 ライセンス

このプロジェクトは非公開です。
