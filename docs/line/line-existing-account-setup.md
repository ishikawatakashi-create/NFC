# 既存の公式LINEアカウントでMessaging APIを有効化する手順

**目的**: 既に作成済みの公式LINEアカウントにMessaging APIを有効化して、入退室通知機能を使えるようにする

---

## 📋 重要なポイント

**公式LINEアカウントとMessaging APIチャネルの関係**:
- **公式LINEアカウント**: LINE公式アカウントマネージャー (https://manager.line.biz/) で作成したアカウント
- **Messaging APIチャネル**: LINE Developers Consoleで作成する、Messaging APIを使うための設定
- **両者は別物ですが、紐付ける必要があります**

---

## 🔄 セットアップ手順

### ⚠️ 重要: 手順の変更について

**2024年以降、LINE Developers Consoleから直接Messaging APIチャネルを作成することはできなくなりました。**

既存の公式LINEアカウントがある場合、以下の手順で進めてください：

---

### ステップ1: LINE公式アカウントマネージャーでMessaging APIを有効化

既存の公式LINEアカウントでMessaging APIを使うには、**LINE公式アカウントマネージャーで有効化**する必要があります。

1. **LINE公式アカウントマネージャーにアクセス**
   - https://manager.line.biz/ にアクセス
   - LINEアカウントでログイン

2. **既存の公式アカウントを選択**
   - アカウント一覧から、使用したい公式アカウントを選択

3. **Messaging APIを有効化**
   - 左側のメニューから「**設定**」を選択
   - 「**Messaging API**」セクションを探す
   - 「**Messaging APIを利用する**」を「オン」に設定
   - 必要に応じて、プロバイダーを選択または作成

4. **チャネルアクセストークンを発行**
   - 「Messaging API」設定画面で「**チャネルアクセストークン（長期）**」を探す
   - 「**発行**」ボタンをクリック
   - トークンをコピーして保管（重要: 一度しか表示されません）

**注意**: チャネルアクセストークンは、LINE公式アカウントマネージャーまたはLINE Developers Consoleのどちらかで発行できます。

---

### ステップ2: LINE Developers Consoleでチャネルを確認

Messaging APIを有効化すると、自動的にLINE Developers Consoleにチャネルが表示されます。

1. **LINE Developers Console にアクセス**
   - https://developers.line.biz/console/
   - 同じLINEアカウントでログイン

2. **プロバイダーを確認**
   - 左側のメニューからプロバイダーを選択
   - Messaging APIチャネルが表示されていることを確認

3. **チャネル詳細を確認**
   - チャネルをクリックして詳細ページを開く
   - 「チャネル基本設定」でチャネルIDを確認
   - 「Messaging API設定」でWebhook URLを設定できることを確認

**注意**: チャネルアクセストークンは、ステップ1で既に取得済みの場合は、このステップはスキップできます。

---

### ステップ3: チャネルアクセストークンの確認（必要に応じて）

LINE Developers Consoleでチャネルアクセストークンを確認・再発行する場合：

1. LINE Developers Console → 該当チャネル → 「Messaging API設定」タブ
2. 「チャネルアクセストークン（長期）」セクションを確認
3. 既にトークンがある場合は表示される
4. ない場合、または再発行する場合は「発行」ボタンをクリック

---

### ステップ4: 環境変数の設定

プロジェクトルートの `.env.local` ファイルに以下を追加：

```env
# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=ここにステップ1で取得したトークンを貼り付け

# サイトID（既存の設定があればそのまま）
SITE_ID=your_site_id
```

---

### ステップ5: Webhook URLの設定

#### 4-1. 開発サーバーとngrokを起動（ローカル開発の場合）

```bash
# ターミナル1: 開発サーバーを起動
npm run dev
# または
pnpm dev

# ターミナル2: ngrokでトンネルを作成
ngrok http 3000
```

ngrokのURL（例: `https://xxxx-xxxx-xxxx.ngrok.io`）をコピー

#### 4-2. LINE Developers ConsoleでWebhook URLを設定

1. LINE Developers Console → 作成したチャネル → 「Messaging API設定」タブ
2. **Webhook URL** に以下を設定：
   ```
   https://xxxx-xxxx-xxxx.ngrok.io/api/line/webhook
   ```
   （ngrokのURLを実際のものに置き換えてください）
3. **Webhook の利用** を「オン」に設定
4. **検証**ボタンをクリック
   - 「成功」と表示されればOK
   - エラーが出る場合は、開発サーバーとngrokが起動しているか確認

#### 4-3. 応答メッセージを無効化

1. LINE公式アカウントマネージャー (https://manager.line.biz/) にアクセス
2. 既存の公式アカウントを選択
3. 「応答設定」→「応答メッセージ」を「オフ」
4. 「Webhook」を「オン」

---

### ステップ6: データベースマイグレーションの実行

Supabase SQL Editorで以下を実行：

```sql
-- migrations/create_parent_line_notification_tables.sql の内容を実行
```

既に実行済みの場合はスキップしてください。

---

## ✅ 確認方法

### 1. チャネルと公式アカウントが紐付いているか確認

- LINE Developers Console → チャネル → 「チャネル基本設定」
- 「公式アカウント」欄に既存の公式アカウント名が表示されていればOK

### 2. Webhookが動作しているか確認

1. 自分のLINEアプリで既存の公式アカウントと友だちになる（既に友だちの場合は一度ブロック解除して再度追加）
2. サーバーログ（ターミナル）を確認
   - 以下のようなログが表示されればOK：
   ```
   [LineWebhook] New LINE user followed: U1234567890abcdefghijklmnopqrstuv
   ```

### 3. 通知が送信できるか確認

1. テスト用の親御さんと生徒を登録
2. 親御さんとLINEアカウントを紐付け
3. NFCカードをタッチして入室
4. LINEアプリで通知が届くか確認

---

## ⚠️ よくある質問

### Q1: 既存の公式アカウントに既にMessaging APIが有効になっている

**A**: その場合は、既存のチャネルを使用できます。
- LINE公式アカウントマネージャーで「設定」→「Messaging API」を確認
- チャネルアクセストークンが既に発行されている場合は、それをコピーして使用
- または、LINE Developers Consoleでチャネルを確認してアクセストークンを取得

### Q2: 複数の公式アカウントがある場合、どれを使えばいい？

**A**: テスト用のアカウントを選択してください。
- 本番運用時は、実際に使用する公式アカウントを選択
- テスト用の場合は、テスト専用のアカウントを作成することを推奨

### Q3: チャネルと公式アカウントが紐付かない

**A**: 以下の点を確認してください：
- 同じLINEアカウントでログインしているか
- 公式アカウントマネージャーでMessaging APIが有効になっているか
- チャネルIDが正しいか

### Q4: 既存の公式アカウントの友だち数はどうなる？

**A**: 既存の友だちはそのまま残ります。
- Messaging APIを有効化しても、既存の友だちに影響はありません
- ただし、通知を送信するには、親御さんとLINEアカウントを紐付ける必要があります

---

## 📝 次のステップ

セットアップが完了したら：

1. **テスト用の親御さんと生徒を登録**
2. **自分のLINEで公式アカウントと友だちになる**
3. **サーバーログからLINE User IDを取得**
4. **API経由で親御さんとLINEアカウントを紐付け**
5. **NFCカードをタッチして通知をテスト**

詳細は `docs/line-test-setup-guide.md` を参照してください。

---

## 📚 参考リンク

- [LINE Developers Console](https://developers.line.biz/console/)
- [LINE公式アカウントマネージャー](https://manager.line.biz/)
- [Messaging API ドキュメント](https://developers.line.biz/ja/docs/messaging-api/)

---

**最終更新**: 2025年1月

