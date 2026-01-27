# ドキュメント一覧と内容まとめ

**最終更新**: 2025年1月

---

## 📚 目次

1. [クライアント向けドキュメント](#クライアント向けドキュメント)
2. [セットアップ・初期設定](#セットアップ初期設定)
3. [NGROK関連](#ngrok関連)
4. [LINE関連](#line関連)
5. [機能説明・ガイド](#機能説明ガイド)
6. [セキュリティ](#セキュリティ)
7. [トラブルシューティング](#トラブルシューティング)
8. [デプロイメント関連](#デプロイメント関連)
9. [開発ガイド](#開発ガイド)

---

## クライアント向けドキュメント

> 📁 場所: `docs/` (ルート)

### `README_CLIENT_DOCS.md`
**用途**: クライアント対応ドキュメントの目次・使い方ガイド

**内容**:
- クライアント対応に必要な3つのドキュメントの説明
- シーン別の使い分け方法
- 情報収集の優先順位
- 標準的なスケジュール（最短1週間〜2週間）

**対象**: 開発者・プロジェクトマネージャー

---

### `client-request-template.md`
**用途**: クライアントに送信する情報提供依頼書（簡潔版）

**内容**:
- 最優先で必要な情報（5項目）
  - 教室の基本情報
  - LINE公式アカウント
  - 生徒・保護者の情報
  - NFCカード
  - 通知内容の希望
- 後日でも構わない情報
- スケジュール感
- 返信フォーマット

**対象**: クライアント様に直接送信（A4 2ページ程度）

---

### `client-faq.md`
**用途**: クライアント向けFAQ（よくある質問30問）

**内容**:
- LINE公式アカウントについて（Q1〜Q3）
- 保護者の登録について（Q4〜Q7）
- NFCカードについて（Q8〜Q11）
- 通知について（Q12〜Q14）
- セキュリティ・プライバシー（Q15〜Q17）
- 費用について（Q18〜Q19）
- 運用について（Q20〜Q23）
- カスタマイズ・拡張（Q24〜Q26）
- トラブル対応（Q27〜Q29）
- その他（Q30）

**対象**: クライアント様・営業担当

---

### `client-information-checklist.md`
**用途**: クライアントから取得すべき情報の完全リスト（詳細版）

**内容**:
- LINE公式アカウント関連
- 教室・運営情報
- 生徒・親御さん情報
- NFCカード情報
- 通知内容のカスタマイズ要件
- 運用ルールとビジネス要件
- デプロイ・インフラ情報
- 親御さんへの案内・配布資料
- テスト・運用開始計画

**対象**: 開発者・プロジェクトマネージャー（チェックボックス付き）

---

## セットアップ・初期設定

> 📁 場所: `docs/setup/`

### `QUICK_START.md`
**用途**: Android端末での動作確認のクイックスタートガイド

**内容**:
- ngrokの起動方法
- ngrokのURL確認方法
- Android端末でのアクセス方法
- 初回アクセス時の注意事項
- トラブルシューティング

---

### `QUICK_LINKS.md`
**用途**: 現在有効なngrok URLと主要ページのクイックリンク集

**内容**:
- 現在のngrok URL
- キオスク画面（入室・退室）のURL
- 管理画面のURL
- テスト・デバッグページのURL
- QRコード生成の推奨方法
- Android端末での設定方法

---

### `admin-authentication-setup.md`
**用途**: 管理者認証機能のセットアップガイド

**内容**:
- データベースマイグレーション
- Supabase Authの設定
- RLS（Row Level Security）の設定
- 環境変数の確認
- 初回管理者の登録方法
- ログイン・ログアウトの使用方法
- セキュリティ注意事項

---

### `ngrok-setup-windows.md`
**用途**: Windows環境でのngrokセットアップガイド

**内容**:
- ngrokのインストール方法（3つの方法）
- プロジェクトディレクトリでの実行方法
- 代替ツール（Cloudflare Tunnel、localtunnel、serveo）の紹介

---

### `SETUP_TUNNEL.md`
**用途**: トンネル設定ガイド（Windows）

**内容**:
- localtunnelを使用する方法（推奨）
- ngrokを直接ダウンロードする方法
- Chocolateyでngrokをインストールする方法
- Web NFCの要件
- 初回アクセス時の警告ページの対処法

---

### `android-testing-guide.md`
**用途**: Android端末での動作確認ガイド

**内容**:
- 方法1: ngrokを使用（推奨・最も簡単）
- 方法2: ローカルIPアドレス + mkcert（HTTPS証明書）
- 方法3: 他の無料ホスティングサービス（Netlify、Railway、Render）
- 方法4: ローカルネットワーク経由（HTTP、NFC非対応）
- 推奨方法
- 注意事項（Web NFCの要件、セキュリティ）
- トラブルシューティング
- Android端末のChromeでデバッグコンソールを確認する方法
- クイックスタート（ngrok）

---

### `password-reset-email-japanese-setup.md`
**用途**: パスワードリセットメールの日本語設定ガイド

---

## NGROK関連

> 📁 場所: `docs/ngrok/`

### `NGROK_SETUP.md`
**用途**: ngrokセットアップ完了後の次のステップ

**内容**:
- ngrokでトンネルを作成する手順
- ngrokのURL確認方法
- Android端末でのアクセス方法
- ngrokのWeb UIの使い方
- トラブルシューティング

---

### `NGROK_AUTH_SETUP.md`
**用途**: ngrok認証設定ガイド

**内容**:
- ngrokアカウントの作成方法
- authtokenの取得方法
- authtokenの設定方法
- 設定の確認方法
- ngrokの無料プランの制限

---

### `NGROK_CONFIG_FIX.md`
**用途**: ngrok設定ファイルの修正方法

**内容**:
- `update_channel` エラーの解決方法
- 設定ファイルの直接編集方法
- PowerShellでの修正方法
- 設定ファイルの再作成方法

---

### `NGROK_FIX_SOLUTION.md`
**用途**: ngrok設定エラーの解決方法

**内容**:
- `update_channel` エラーの詳細な解決方法
- 設定ファイルから `update_channel` 行を削除する方法
- Windows Store版（MSIX）の場合の対処法

---

### `QUICK_FIX_NGROK.md`
**用途**: ngrok設定エラーのクイック修正

**内容**:
- authtokenを設定して設定ファイルを再作成する方法
- 設定ファイルを手動で作成する方法
- ngrokを再インストールする方法

---

### `RESTART_TUNNEL.md`
**用途**: トンネルの再起動手順

**内容**:
- localtunnelを再起動する方法
- Android端末で新しいURLにアクセスする方法
- ngrokを使用する方法（より安定）
- クイックリファレンス

---

### `LOCALTUNNEL_PASSWORD_FIX.md`
**用途**: localtunnelのパスワード問題の解決方法

**内容**:
- パブリックIPアドレスをパスワードとして入力する方法
- ngrokを使用する方法（警告ページなし）
- ローカルネットワーク経由の方法（NFC非対応）

---

## LINE関連

> 📁 場所: `docs/line/`

### `line-integration-flow.md`
**用途**: LINE公式アカウント連携フロー完全ガイド

**内容**:
- システム概要とアーキテクチャ
- セットアップ手順（LINE Developers、環境変数、Webhook設定）
- 運用フロー（最初のセットアップ、親御さんとの紐付け、入退室通知）
- 親御さんとの紐付け方法（詳細）
- APIエンドポイント一覧
- LINE User IDの取得方法
- トラブルシューティング

---

### `line-notification-setup-guide.md`
**用途**: LINE通知機能のセットアップガイド

**内容**:
- データベーステーブルの説明
- LINE通知機能の実装内容
- APIエンドポイント一覧
- セットアップ手順
- 親御さんとLINEアカウントの紐づけ方法
- 使用方法
- 注意事項
- 今後の拡張予定

---

### `line-notification-mechanism-explanation.md`
**用途**: LINE通知機能の仕組みを説明するドキュメント（説明用）

**内容**:
- 一般向け説明（非技術者向け）- 30秒版・詳細版
- 技術者向け説明 - システムアーキテクチャ、データベース構造、コードフロー
- 重要な技術ポイント（RLSバイパス、通知送信条件、エラーハンドリング）
- よくある質問（通知が届かない、カスタマイズ方法、複数親御さん対応など）

**対象**: 
- クライアントやステークホルダーへの説明時に使用
- 開発者向けの技術詳細も含む

---

### `line-webhook-setup-guide.md`
**用途**: LINE Webhook設定ガイド

---

### `line-webhook-quick-setup.md`
**用途**: LINE Webhookクイックセットアップ

---

### `line-webhook-troubleshooting.md`
**用途**: LINE Webhookトラブルシューティング

---

### `line-webhook-debug-checklist.md`
**用途**: LINE Webhookデバッグチェックリスト

---

### `line-webhook-image-fix.md`
**用途**: LINE Webhook画像表示修正ガイド

---

### `line-developers-console-setup-detail.md`
**用途**: LINE Developers Console詳細セットアップガイド

---

### `line-existing-account-setup.md`
**用途**: 既存LINEアカウントのセットアップガイド

---

### `line-test-setup-guide.md`
**用途**: LINEテスト環境セットアップガイド

---

### `line-integration-review.md`
**用途**: LINE連携レビュー

---

### `line-integration-comprehensive-review.md`
**用途**: LINE連携包括的レビュー

---

### `line-integration-features-summary.md`
**用途**: LINE連携機能サマリー

---

### `line-link-qr-code-guide.md`
**用途**: LINEリンクQRコードガイド

---

### `line-qr-code-troubleshooting.md`
**用途**: LINE QRコードトラブルシューティング

---

### `line-self-link-guide.md`
**用途**: LINE自己リンクガイド

---

### `line-parent-self-link-guide.md`
**用途**: LINE保護者自己リンクガイド

---

## 機能説明・ガイド

> 📁 場所: `docs/features/`

### `auto-exit-feature.md`
**用途**: 自動退室機能の実装ガイド

**内容**:
- 機能概要と動作仕様
- セットアップ手順
- 使用方法（自動実行・手動実行）
- APIエンドポイント詳細
- セキュリティ
- トラブルシューティング
- 今後の拡張案

---

### `nfc-card-registration-guide.md`
**用途**: NFCカード登録機能の実装ガイド

**内容**:
- データベーステーブル（card_tokens、student_cards）
- APIエンドポイント（カード発行、無効化）
- UI追加内容
- セットアップ手順
- 動作確認手順
- トラブルシューティング
- セキュリティ注意事項
- 今後の拡張案

---

### `kiosk-screen-guide.md`
**用途**: キオスク画面（スマホ端末側）操作ガイド

**内容**:
- キオスク画面の種類（入口側・出口側）
- セットアップ手順（Android端末の準備、ブラウザ設定、固定設置）
- 使用方法（入室時・退室時の流れ）
- 画面の見方
- エラーメッセージの説明
- トラブルシューティング
- 動作フロー（技術詳細）
- デモ動画の撮影方法
- よくある質問

---

### `serial-number-authentication.md`
**用途**: シリアル番号ベース認証への変更ガイド

**内容**:
- 変更内容（キオスク画面、カード検証API、管理画面）
- 使用方法
- 注意事項（セキュリティ、後方互換性）
- 技術詳細（データベース、Web NFC API）
- テスト手順
- 元の方式に戻す方法
- トラブルシューティング

---

### `nfc-card-compatibility.md`
**用途**: NFCカード互換性ガイド

**内容**:
- 対応カード（自動読み取り可能）
- 非対応カード（自動読み取り不可）
- 回避策（手動入力）
- 推奨カード（NTAG213/215/216、Unit Linkカード）
- テスト方法
- 注意事項（セキュリティ、プライバシー）
- トークン方式への切り替え
- まとめ
- トラブルシューティング

---

### `webhook-explanation.md`
**用途**: Webhookの説明

---

## セキュリティ

> 📁 場所: `docs/security/`

### `rls-setup-guide.md`
**用途**: RLS（Row Level Security）セットアップガイド

**内容**:
- 背景と対象テーブル
- 実装内容（RLSの有効化、管理者チェック関数、RLSポリシー）
- 実行方法
- 注意事項（サービスロールキーの使用、既存のデータアクセス、テーブル構造の確認、型の不一致）
- トラブルシューティング
- 検証方法
- セキュリティ設定（漏洩パスワード保護、関数のsearch_path設定）

---

### `security-fix-summary.md`
**用途**: セキュリティ修正サマリー

---

### `security-fix-rls-search-path.md`
**用途**: RLS search_pathセキュリティ修正ガイド

---

### `SECURITY_FIX_APPLY_GUIDE.md`
**用途**: セキュリティ修正適用ガイド

---

## トラブルシューティング

> 📁 場所: `docs/troubleshooting/`

### `TROUBLESHOOTING_503.md`
**用途**: 503エラー（Tunnel Unavailable）の解決方法

**内容**:
- 問題の原因
- 解決方法（開発サーバーの起動、localtunnelの再起動、ポート確認）
- 完全な再起動手順
- ngrokを使用する方法（推奨）
- チェックリスト
- トラブルシューティング

---

### `TESTING_STEPS.md`
**用途**: テスト手順（カードが読み込まれない場合の対処）

**内容**:
- ブラウザのハードリロード方法
- 開発サーバーの再起動方法
- テスト手順（管理画面でのカード登録、キオスク画面での入室テスト）
- デバッグ方法
- よくある問題

---

### `debugging-nfc-serial-number.md`
**用途**: NFCシリアル番号読み取り問題のデバッグ手順

**内容**:
- 簡単な確認方法
- リモートデバッグで詳細を確認する方法
- 問題の原因を特定する方法
- 解決方法
- 緊急時の対処法

---

### `database-fix-guide.md`
**用途**: データベース修正ガイド（管理者名の修正方法）

**内容**:
- Supabaseダッシュボードから修正する方法
- SQL Editorから修正する方法
- メールアドレスが分からない場合の対処法
- 注意事項
- トラブルシューティング

---

### `CARD_REGISTRATION_FIX_GUIDE.md`
**用途**: カード登録修正ガイド

---

### `LINE_NOTIFICATION_DEBUG_CHECKLIST.md`
**用途**: LINE通知デバッグチェックリスト

---

### `LINE_NOTIFICATION_TEMPLATE_FIX_GUIDE.md`
**用途**: LINE通知テンプレート修正ガイド

---

### `PARENT_STUDENT_LINK_DEBUG_GUIDE.md`
**用途**: 保護者・生徒リンクデバッグガイド

---

## デプロイメント関連

> 📁 場所: `docs/deployment/`

### `vercel-deployment-guide.md`
**用途**: Vercelデプロイガイド

**内容**:
- デプロイ前の確認事項
- Vercelへのデプロイ手順（CLI使用・GitHub連携）
- 環境変数の設定方法
- よくある問題と解決方法（ビルドエラー、環境変数、APIルート、自動退室機能、Supabase接続）
- デプロイ後の確認
- トラブルシューティングのチェックリスト

---

### `vercel-logs-guide.md`
**用途**: Vercelログ確認ガイド

**内容**:
- Vercelダッシュボードでログを確認する方法
- デプロイメントログの確認
- リアルタイムログの確認
- ログの検索方法
- 確認すべきログの内容
- ログから削除操作を特定する方法
- 注意事項（ログの保持期間、制限）
- 今後の改善案（監査ログ機能の追加）

---

### `vercel-cron-issue.md`
**用途**: Vercel Cron設定の問題と解決方法

**内容**:
- 問題の説明（Vercel Proプラン以上で利用可能）
- 解決方法（Cron設定を削除、外部のCronサービスを使用、Vercel Proプランにアップグレード）
- 確認方法
- 自動退室機能の代替案

---

### `deployed-urls.md`
**用途**: デプロイ済みURL一覧

**内容**:
- 主要ページURL（ルートページ、管理画面、キオスク画面、その他）
- APIエンドポイント一覧

---

### `service-launch-checklist.md`
**用途**: サービス公開チェックリスト（自社内利用版）

**内容**:
- Phase 1: セキュリティ・法的要件（必須）
- Phase 2: 技術的準備（必須）
- Phase 3: 運用準備（推奨）
- 保護者への説明・同意取得
- 本番運用開始
- 運用後のメンテナンス
- トラブルシューティング

**対象**: プロジェクトマネージャー・開発者（サービス公開前の確認用）

---

### `production-ready-checklist.md`
**用途**: 本番環境運用準備チェックリスト（開発側面）

**内容**:
- Phase 1: セキュリティ実装・確認（必須）
- Phase 2: 本番環境設定（必須）
- Phase 3: テスト・検証（必須）
- Phase 4: エラーハンドリング・監視（推奨）
- Phase 5: パフォーマンス・最適化（推奨）
- 本番運用開始前の最終確認

**対象**: 開発者（本番環境で実際に使えるようになるための技術的な準備）

---

### `production-tasks.md`
**用途**: 本番運用開始までのタスク一覧（親タスク・子タスク構造）

**内容**:
- セキュリティ・認証の確認・強化
- 本番環境の設定・確認
- 機能テスト・検証
- 未実装機能の実装
- 監視・ログ・バックアップ
- パフォーマンス最適化
- ドキュメント整備
- 社内サポート体制の整備
- 段階的な運用開始

**対象**: プロジェクトマネージャー・開発者（タスク管理用）

---

## 開発ガイド

> 📁 場所: `docs/development/`

### `current-status-analysis.md`
**用途**: WEBアプリケーション現状分析レポート

**内容**:
- できること（生徒管理、NFCカード管理、入退室管理、開放時間管理、設定機能、データベース機能）
- できないこと（認証・認可、通知機能、ポイント機能、自動化機能、レポート・分析機能）
- 不足していること（セキュリティ関連、エラーハンドリング、パフォーマンス、データ整合性、テスト、ドキュメント）
- 直したほうがいいこと（セキュリティ、設定機能の実装、エラーハンドリング、パフォーマンス改善、データ整合性、コード品質、UI/UX改善）
- 拡張したほうがいいこと（通知機能、ポイント機能、自動化機能、レポート・分析機能、カード管理機能、マルチテナント機能）
- 優先度マトリックス
- 技術スタック確認
- 次のステップ推奨
- 注意事項

---

### `improvement-suggestions.md`
**用途**: サービス改善提案

**内容**:
- 現状確認（既に実装済み、改善が必要な項目）
- 高優先度（設定保存機能、ページネーション、型安全性の改善）
- 中優先度（エラーハンドリング、APIセキュリティ、ローディング状態、データ整合性）
- 低優先度（テストコード、統計ダッシュボード、自動退室処理、カード履歴管理、エクスポート機能）
- 実装優先順位（Phase 1〜4）
- 推奨される次のステップ
- 注意事項

---

### `CODEX_SETUP_GUIDE.md`
**用途**: Codex CLI リポジトリ紐づけ問題の解決方法

**内容**:
- 現在の状況
- 問題の原因
- 解決方法（認証情報をリセット、設定ファイルでワークスペース指定、個人プロジェクトで作業）
- 重要なポイント
- 確認方法
- トラブルシューティング

---

### `coding-standards.md`
**用途**: コーディング規約

---

### `current-features.md`
**用途**: 現在の機能一覧

---

### `point-system-debugging-guide.md`
**用途**: ポイントシステムデバッグガイド

---

### `point-system-implementation-summary.md`
**用途**: ポイントシステム実装サマリー

---

### `point-system-review-and-improvements.md`
**用途**: ポイントシステムレビューと改善

---

### `web-nfc-api-limitations.md`
**用途**: Web NFC APIの制限について

**内容**:
- NFC ToolsとWeb NFC APIの技術的な違い
- 詳細な比較表
- 制限がある理由（セキュリティ上の理由、標準化、クロスプラットフォーム対応）
- 具体的な例（Suicaカードの場合）
- 解決策（NDEF対応カードを使用、ネイティブアプリを開発、手動登録で対応）
- 参考資料
- まとめ

---

### `android-native-app-migration-guide.md`
**用途**: Androidネイティブアプリ化の難易度評価ガイド

**内容**:
- 難易度評価サマリー
- 現在のアプリケーション構成
- Androidネイティブ化のアプローチ（React Native、Kotlin/Java、Capacitor）
- 詳細な作業項目（NFC機能、UI/UX、バックエンド連携、認証システム、データ管理）
- 推奨アプローチ（段階的移行戦略）
- コスト比較
- 注意点と課題
- 実装開始の判断基準
- 参考リソース
- 結論

---

## 📊 ドキュメント統計

- **総ドキュメント数**: 70+ファイル
- **クライアント向け**: 4ファイル（`docs/`）
- **セットアップ・初期設定**: 7ファイル（`docs/setup/`）
- **NGROK関連**: 7ファイル（`docs/ngrok/`）
- **LINE関連**: 18ファイル（`docs/line/`）
- **機能説明・ガイド**: 6ファイル（`docs/features/`）
- **セキュリティ**: 4ファイル（`docs/security/`）
- **トラブルシューティング**: 8ファイル（`docs/troubleshooting/`）
- **デプロイメント関連**: 7ファイル（`docs/deployment/`）
- **開発ガイド**: 10ファイル（`docs/development/`）

---

## 🎯 よく使うドキュメント

### クライアント対応時
1. `README_CLIENT_DOCS.md` - 全体の使い方
2. `client-request-template.md` - 依頼書テンプレート
3. `client-faq.md` - FAQ集
4. `client-information-checklist.md` - 情報チェックリスト

### セットアップ時
1. `setup/QUICK_START.md` - クイックスタート
2. `setup/admin-authentication-setup.md` - 管理者認証設定
3. `setup/ngrok-setup-windows.md` - ngrokセットアップ
4. `line/line-notification-setup-guide.md` - LINE通知設定

### トラブルシューティング時
1. `troubleshooting/TROUBLESHOOTING_503.md` - 503エラー
2. `troubleshooting/TESTING_STEPS.md` - テスト手順
3. `troubleshooting/debugging-nfc-serial-number.md` - NFCデバッグ
4. `deployment/vercel-logs-guide.md` - Vercelログ確認

### 機能実装時
1. `line/line-integration-flow.md` - LINE連携フロー
2. `features/auto-exit-feature.md` - 自動退室機能
3. `features/nfc-card-registration-guide.md` - NFCカード登録
4. `features/kiosk-screen-guide.md` - キオスク画面

---

## 📁 ディレクトリ構造

```
docs/
├── DOCUMENTATION_INDEX.md          # このファイル
├── README_CLIENT_DOCS.md           # クライアント向けドキュメント目次
├── client-*.md                     # クライアント向けドキュメント
├── setup/                          # セットアップ・初期設定
│   ├── QUICK_START.md
│   ├── QUICK_LINKS.md
│   ├── admin-authentication-setup.md
│   └── ...
├── ngrok/                          # NGROK関連
│   ├── NGROK_SETUP.md
│   ├── NGROK_AUTH_SETUP.md
│   └── ...
├── line/                           # LINE関連
│   ├── line-integration-flow.md
│   ├── line-notification-setup-guide.md
│   └── ...
├── features/                       # 機能説明・ガイド
│   ├── auto-exit-feature.md
│   ├── nfc-card-registration-guide.md
│   └── ...
├── security/                       # セキュリティ
│   ├── rls-setup-guide.md
│   └── ...
├── troubleshooting/                # トラブルシューティング
│   ├── TROUBLESHOOTING_503.md
│   └── ...
├── deployment/                     # デプロイメント関連
│   ├── vercel-deployment-guide.md
│   └── ...
└── development/                    # 開発ガイド
    ├── current-status-analysis.md
    └── ...
```

---

## 📝 ドキュメント更新の推奨事項

1. **定期的な見直し**: 機能追加・変更時に該当ドキュメントを更新
2. **バージョン管理**: ドキュメントに最終更新日を記載
3. **リンクの確認**: ドキュメント間の相互リンクが正しいか確認
4. **実装状況の反映**: 実装済み機能のドキュメントを最新化
5. **ディレクトリ構造の維持**: 新しいドキュメントは適切なディレクトリに配置

---

**最終更新**: 2025年1月
