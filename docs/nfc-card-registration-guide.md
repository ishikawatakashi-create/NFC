# NFCカード登録機能 実装ガイド

## 概要

生徒にNFCカードを登録し、NDEFトークンを書き込む機能を実装しました。
カードUID依存ではなく、必ずNDEFにトークンを書き込む方式で運用します。

---

## 実装内容

### 1. DBテーブル

以下の2つのテーブルを追加しました：

#### card_tokens
- NFCカードに書き込むトークンを管理
- フィールド：
  - `id`: UUID（主キー）
  - `site_id`: 施設ID
  - `token`: NDEF書き込み用トークン（例: `iru:card:xxxxx`）
  - `is_active`: トークンが有効かどうか
  - `issued_at`: トークン発行日時
  - `disabled_at`: トークン無効化日時
  - `note`: 備考

#### student_cards
- 生徒とカードトークンの紐付けを管理（1生徒1枚運用）
- フィールド：
  - `student_id`: 生徒ID（外部キー）
  - `card_token_id`: カードトークンID（外部キー）
  - `created_at`: 紐付け作成日時
- 制約：
  - `student_id` に UNIQUE 制約（1生徒1枚のみ）
  - CASCADE DELETE（生徒削除時にカード紐付けも削除）

### 2. APIエンドポイント

#### POST /api/cards/issue
- **用途**: 生徒にNFCカードトークンを発行し、DBに紐付ける
- **リクエスト**:
  ```json
  {
    "studentId": "uuid"
  }
  ```
- **レスポンス**:
  ```json
  {
    "ok": true,
    "token": "iru:card:xxxxx",
    "cardTokenId": "uuid",
    "studentName": "山田太郎"
  }
  ```
- **処理内容**:
  1. 生徒がSITE_IDに属するか検証
  2. 既存のカード紐付けがあれば無効化・削除
  3. 新しいトークンを生成（`iru:card:` + 32文字ランダム）
  4. `card_tokens` に挿入
  5. `student_cards` に紐付け

#### POST /api/cards/disable
- **用途**: カードトークンを無効化する
- **リクエスト**:
  ```json
  {
    "token": "iru:card:xxxxx"
  }
  ```
  または
  ```json
  {
    "cardTokenId": "uuid"
  }
  ```
- **レスポンス**:
  ```json
  {
    "ok": true
  }
  ```

### 3. UI追加

#### /admin/students/page.tsx
- 生徒一覧の操作列に「カード登録」ボタンを追加
- カード登録Dialogを実装：
  - 手順説明
  - NFC対応チェック
  - HTTPS環境チェック
  - トークン発行 → Web NFC書き込み → 完了表示
  - エラーハンドリング（無効化ボタン付き）

---

## セットアップ手順

### 1. 環境変数の確認

`.env.local` に以下の環境変数が設定されていることを確認してください：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SITE_ID=your-site-uuid
```

**重要**: `SUPABASE_SERVICE_ROLE_KEY` は必須です（サーバ側でのDB操作に使用）。

### 2. DBマイグレーション実行

Supabaseのダッシュボードで以下のSQLを実行してください：

1. `migrations/create_card_tokens_table.sql`
2. `migrations/create_student_cards_table.sql`

または、Supabase CLIを使用する場合：

```bash
supabase db push
```

### 3. 依存関係の確認

`package.json` に以下のパッケージがインストールされていることを確認：

```json
{
  "@supabase/supabase-js": "^2.x.x",
  "next": "^14.x.x",
  ...
}
```

---

## 動作確認手順

### ローカル環境での確認

1. **開発サーバー起動**
   ```bash
   npm run dev
   ```

2. **HTTPS化（必須）**
   - Web NFCはHTTPS環境でのみ動作します
   - ローカルの場合は `localhost` で動作しますが、実機テストには以下が必要：
     - ngrok等でHTTPSトンネルを作成
     - または、mkcert等でローカルHTTPS証明書を設定

   **ngrokを使う例**:
   ```bash
   npx ngrok http 3000
   ```
   表示されたHTTPS URLをAndroid端末で開く

3. **Android端末でアクセス**
   - Android端末（Chrome推奨）で管理画面にアクセス
   - `/admin/students` を開く

4. **カード登録テスト**
   - 生徒一覧から任意の生徒の「カード登録」ボタンをクリック
   - Dialogが開き、手順が表示される
   - 「開始」ボタンをクリック
   - NFCカードを端末にタッチ
   - 「登録完了」が表示されれば成功

### 本番環境での確認

1. **デプロイ**
   ```bash
   npm run build
   # Vercel/Netlify等にデプロイ
   ```

2. **HTTPS確認**
   - 本番URLがHTTPSであることを確認（Vercel等は自動でHTTPS）

3. **Android端末でアクセス**
   - 本番URLにアクセスして同様にテスト

---

## トラブルシューティング

### 1. "この端末/ブラウザはNFC読み取りに対応していません"

**原因**:
- Android Chrome以外のブラウザを使用している
- iOSデバイスを使用している（Web NFCは未対応）

**対策**:
- Android端末でChromeブラウザを使用してください

### 2. "HTTPS環境で実行してください"

**原因**:
- HTTP環境でアクセスしている（localhost以外）

**対策**:
- ngrok等でHTTPSトンネルを作成
- または、本番環境（HTTPS）でテスト

### 3. "トークン発行に失敗しました"

**原因**:
- `SUPABASE_SERVICE_ROLE_KEY` が未設定
- `SITE_ID` が未設定
- 生徒がSITE_IDに属していない

**対策**:
- `.env.local` の環境変数を確認
- Supabaseのダッシュボードで生徒の `site_id` を確認

### 4. "カード紐付けに失敗しました"

**原因**:
- DBテーブルが作成されていない
- 外部キー制約エラー

**対策**:
- マイグレーションSQLを再実行
- Supabaseダッシュボードでテーブル構造を確認

### 5. Web NFC書き込みがタイムアウトする

**原因**:
- NFCカードがNDEF非対応
- カードが書き込みロックされている
- カードの容量不足

**対策**:
- NDEF対応のNFCカード（Type 2、Type 4等）を使用
- 新しいカードに交換
- 「発行済みトークンを無効化」ボタンでロールバック

---

## セキュリティ注意事項

1. **SUPABASE_SERVICE_ROLE_KEY の管理**
   - 絶対にクライアント側に公開しない
   - `.env.local` に記載し、`.gitignore` で除外されていることを確認

2. **SITE_ID チェック**
   - すべてのAPI操作で必ず `site_id` をチェックしています
   - クライアントから `site_id` を受け取らず、サーバ側の環境変数から取得

3. **トークンの再利用防止**
   - トークンは必ず新規生成され、既存トークンは無効化されます
   - `card_tokens.token` に UNIQUE 制約があります

---

## 今後の拡張案

1. **カード履歴管理**
   - 生徒ごとに登録されたカードの履歴を表示
   - 無効化されたカードも履歴として保持

2. **一括登録機能**
   - 複数の生徒に一度にカードを登録

3. **カード再発行**
   - 既存カードを無効化せずに追加カードを発行（複数カード運用）

4. **トークンの暗号化**
   - セキュリティ強化のため、トークンをDB保存時に暗号化

---

## 参考資料

- [Web NFC API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_NFC_API)
- [Supabase Client Library](https://supabase.com/docs/reference/javascript/introduction)
- [Next.js App Router](https://nextjs.org/docs/app)







