# LINE公式アカウント テストセットアップガイド

**目的**: 公式LINEアカウントを用意したので、テスト用として試してみるための手順

---

## 📋 セットアップ手順（簡易版）

### ステップ1: LINE Developersでチャネルアクセストークンを取得

1. **LINE Developers Console にアクセス**
   - https://developers.line.biz/console/
   - LINEアカウントでログイン

2. **プロバイダーを作成**（既存のものがない場合）
   - 「新規プロバイダー作成」をクリック
   - プロバイダー名を入力（例：「テスト用」）

3. **Messaging APIチャネルを作成**
   - 「チャネルを追加」→「Messaging API」を選択
   - チャネル名: 「テスト用 入退室通知」
   - チャネル説明: 「生徒の入退室を保護者に通知するテストシステム」
   - 大業種/小業種: 適切なものを選択
   - メールアドレス: 管理者のメールアドレス

4. **チャネルアクセストークンを発行**
   - チャネル作成後、「Messaging API設定」タブに移動
   - 「チャネルアクセストークン（長期）」の「発行」ボタンをクリック
   - **重要**: 発行されたトークンをコピーして保管（後で使用します）

---

### ステップ2: 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成（既にある場合は追記）し、以下を追加：

```env
# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=ここに先ほどコピーしたトークンを貼り付け

# サイトID（既存の設定があればそのまま）
SITE_ID=your_site_id
```

**注意**: 
- `.env.local` ファイルは `.gitignore` に含まれているため、Gitにはコミットされません
- トークンは機密情報なので、絶対に公開しないでください

---

### ステップ3: データベースマイグレーションの確認・実行

1. **Supabaseダッシュボードにアクセス**
   - https://app.supabase.com/
   - プロジェクトを選択

2. **SQL Editorを開く**
   - 左メニューから「SQL Editor」を選択

3. **マイグレーションファイルを実行**
   - `migrations/create_parent_line_notification_tables.sql` の内容をコピー
   - SQL Editorに貼り付けて実行

4. **テーブルが作成されたことを確認**
   - 左メニューから「Table Editor」を選択
   - 以下のテーブルが作成されていることを確認：
     - `parents`（親御さん情報）
     - `parent_students`（親御さんと生徒の紐づけ）
     - `parent_line_accounts`（LINEアカウント情報）
     - `line_notification_logs`（通知送信履歴）

---

### ステップ4: Webhook URLの設定（ローカル開発環境の場合）

ローカル環境でテストする場合は、ngrokなどのトンネルサービスを使用します。

#### 4-1. 開発サーバーを起動

```bash
npm run dev
# または
pnpm dev
```

サーバーが `http://localhost:3000` で起動していることを確認

#### 4-2. ngrokでトンネルを作成

別のターミナルで：

```bash
ngrok http 3000
```

ngrokのURL（例: `https://xxxx-xxxx-xxxx.ngrok.io`）をコピー

#### 4-3. LINE Developers ConsoleでWebhook URLを設定

1. LINE Developers Console → 該当チャネル → 「Messaging API設定」タブ
2. **Webhook URL** に以下を設定：
   ```
   https://xxxx-xxxx-xxxx.ngrok.io/api/line/webhook
   ```
   （ngrokのURLを実際のものに置き換えてください）
3. **Webhook の利用** を「オン」に設定
4. **検証**ボタンをクリックして接続を確認
   - 「成功」と表示されればOK

#### 4-4. 応答メッセージを無効化

1. LINE公式アカウントマネージャー (https://manager.line.biz/) にアクセス
2. 該当のアカウントを選択
3. 「応答設定」→「応答メッセージ」を「オフ」
4. 「Webhook」を「オン」

---

### ステップ5: テスト手順

#### 5-1. テスト用の親御さんと生徒を準備

1. **管理画面で生徒を登録**（既にある場合はスキップ）
   - 管理画面にアクセス
   - 生徒を登録（`role='student'` であることを確認）

2. **親御さんを登録**
   - API経由で親御さんを登録：
   ```bash
   POST /api/parents
   {
     "name": "テスト親御さん",
     "phoneNumber": "090-1234-5678",
     "email": "test@example.com",
     "relationship": "mother",
     "studentIds": ["<生徒のUUID>"]
   }
   ```
   - または、管理画面から登録（UIが実装されている場合）

#### 5-2. LINE公式アカウントと友だちになる

1. **QRコードを取得**
   - LINE Developers Console → 該当チャネル → 「Messaging API設定」
   - QRコードをダウンロードまたは表示

2. **自分のLINEアプリでQRコードをスキャン**
   - 友だち追加

3. **サーバーログを確認**
   - ターミナルまたはVercelのログで以下を確認：
   ```
   [LineWebhook] New LINE user followed: U1234567890abcdefghijklmnopqrstuv
   ```
   - この `U1234567890abcdefghijklmnopqrstuv` がLINE User IDです

#### 5-3. 親御さんとLINEアカウントを紐付け

API経由で紐付け：

```bash
POST /api/parents/{親御さんのID}/line-account
{
  "lineUserId": "U1234567890abcdefghijklmnopqrstuv",
  "lineDisplayName": "テスト親御さん"
}
```

**親御さんのIDの確認方法**:
- Supabaseの `parents` テーブルから確認
- または、API `GET /api/parents` で一覧を取得

#### 5-4. 入退室テスト

1. **NFCカードをタッチ**（キオスク画面で）
2. **LINEアプリで通知を確認**
   - 以下のような通知が届くはずです：
   ```
   太郎さんが入室しました。
   時刻: 2026/01/06 15:30
   ```

---

## 🔍 トラブルシューティング

### 通知が届かない場合

1. **環境変数を確認**
   ```bash
   # .env.localファイルに以下が設定されているか確認
   LINE_CHANNEL_ACCESS_TOKEN=xxx
   ```

2. **生徒のroleを確認**
   - `students` テーブルの `role` が `'student'` になっているか確認
   - 管理者（`role='admin'`）の場合は通知されません

3. **親御さんと生徒の紐付けを確認**
   ```sql
   SELECT * FROM parent_students WHERE student_id = '<生徒UUID>';
   ```

4. **LINEアカウントの登録を確認**
   ```sql
   SELECT * FROM parent_line_accounts WHERE parent_id = '<親UUID>' AND is_active = true;
   ```

5. **サーバーログを確認**
   - ターミナルまたはVercelのログでエラーメッセージを確認

### Webhookが動作しない場合

1. **Webhook URLが正しいか確認**
   - LINE Developers Console → Messaging API設定 → Webhook URL
   - ngrokを使用している場合、URLが変更されていないか確認

2. **Webhookが有効になっているか確認**
   - LINE Developers Console → Messaging API設定 → Webhook の利用: オン

3. **応答メッセージが無効化されているか確認**
   - LINE公式アカウントマネージャー → 応答設定 → 応答メッセージ: オフ

4. **開発サーバーが起動しているか確認**
   - `npm run dev` でサーバーが起動しているか確認
   - ngrokが動作しているか確認

### LINE User IDが分からない場合

1. **Webhookログを確認**（推奨）
   - 友だち追加した際のサーバーログを確認
   - `[LineWebhook] New LINE user followed: U...` のログから取得

2. **LINE公式アカウントマネージャーから確認**
   - https://manager.line.biz/ にアクセス
   - 該当のアカウントを選択
   - 「チャット」タブ → 該当ユーザーのチャットを開く
   - ユーザー情報にUser IDが表示される

---

## 📝 次のステップ

テストが成功したら：

1. **本番環境へのデプロイ**
   - Vercelなどにデプロイ
   - 本番環境のWebhook URLを設定

2. **管理画面UIの実装**（オプション）
   - 親御さん管理画面
   - LINE紐付け画面
   - 通知履歴画面

3. **通知内容のカスタマイズ**
   - メッセージテンプレートの変更
   - 通知タイミングの調整

---

## 📚 参考リンク

- [LINE Developers Console](https://developers.line.biz/console/)
- [LINE Messaging API リファレンス](https://developers.line.biz/ja/reference/messaging-api/)
- [LINE公式アカウントマネージャー](https://manager.line.biz/)
- 詳細なドキュメント: `docs/line-integration-flow.md`

---

**最終更新**: 2025年1月

