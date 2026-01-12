# LINE通知テンプレート機能修正ガイド

## 🔍 発見された問題

### 問題の内容
親御さんと生徒を紐づけても、設定画面で設定した「通知テンプレート」の内容が通知されず、ハードコードされたメッセージが送信されていました。

#### 詳細
1. **通知テンプレート設定画面**（`/admin/settings`）
   - UIは存在するが、保存処理が未実装（console.logのみ）
   - 設定した内容がデータベースに保存されない

2. **LINE通知送信処理**（`lib/line-notification-utils.ts`）
   - ハードコードされたメッセージを送信
   - テンプレートを読み込む処理がない
   - [生徒名]、[現在時刻]のタグ置換処理がない

---

## ✅ 実施した修正

### 1. データベースマイグレーション

**新規ファイル:** `migrations/add_notification_templates_to_point_settings.sql`

`point_settings`テーブルに通知テンプレートカラムを追加：

```sql
ALTER TABLE point_settings 
ADD COLUMN IF NOT EXISTS entry_notification_template TEXT NULL;

ALTER TABLE point_settings 
ADD COLUMN IF NOT EXISTS exit_notification_template TEXT NULL;
```

デフォルト値として以下のテンプレートを設定：
- 入室: `[生徒名]さんが入室しました。\n時刻: [現在時刻]`
- 退室: `[生徒名]さんが退室しました。\n時刻: [現在時刻]`

### 2. APIエンドポイントの更新

**修正ファイル:** `app/api/point-settings/route.ts`

#### GET /api/point-settings
通知テンプレートを含めて取得するように変更：

```typescript
.select("entry_points, daily_limit, entry_notification_template, exit_notification_template")
```

#### PUT /api/point-settings
通知テンプレートを保存できるように変更：

```typescript
const { entryPoints, dailyLimit, entryTemplate, exitTemplate } = body;

// UPSERT用のデータに通知テンプレートを追加
if (entryTemplate !== undefined) {
  updateData.entry_notification_template = entryTemplate;
}
if (exitTemplate !== undefined) {
  updateData.exit_notification_template = exitTemplate;
}
```

### 3. 設定画面の保存処理実装

**修正ファイル:** `app/admin/settings/page.tsx`

#### 初期値の読み込み
`useEffect`でAPI経由でテンプレートを読み込み：

```typescript
useEffect(() => {
  const loadSettings = async () => {
    const res = await fetch("/api/point-settings")
    const data = await res.json()

    if (data.ok && data.settings) {
      if (data.settings.entry_notification_template) {
        setEntryTemplate(data.settings.entry_notification_template)
      }
      if (data.settings.exit_notification_template) {
        setExitTemplate(data.settings.exit_notification_template)
      }
    }
  }

  loadSettings()
}, [])
```

#### 保存処理の実装
`handleSave`関数を実際のAPI呼び出しに変更：

```typescript
const handleSave = async () => {
  setLoading(true)
  try {
    const res = await fetch("/api/point-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entryPoints: 1,
        dailyLimit: true,
        entryTemplate,
        exitTemplate,
      }),
    })

    const data = await res.json()

    if (!res.ok || !data.ok) {
      throw new Error(data.error || "設定の保存に失敗しました")
    }

    toast({
      title: "設定を保存しました",
      description: "通知テンプレートの変更が正常に保存されました。",
    })
  } catch (error: any) {
    toast({
      variant: "destructive",
      title: "エラー",
      description: error.message || "設定の保存に失敗しました",
    })
  } finally {
    setLoading(false)
  }
}
```

### 4. LINE通知送信処理の修正

**修正ファイル:** `lib/line-notification-utils.ts`

#### テンプレート読み込み処理を追加

```typescript
// 4. 通知テンプレートを取得
const { data: pointSettings } = await supabase
  .from("point_settings")
  .select("entry_notification_template, exit_notification_template")
  .eq("site_id", siteId)
  .single();

// 5. イベント種別に応じたメッセージテンプレートを取得
let messageTemplate: string;
if (eventType === "entry") {
  messageTemplate = pointSettings?.entry_notification_template || "[生徒名]さんが入室しました。\n時刻: [現在時刻]";
} else if (eventType === "exit") {
  messageTemplate = pointSettings?.exit_notification_template || "[生徒名]さんが退室しました。\n時刻: [現在時刻]";
} else {
  // forced_exitの場合は退室テンプレートを使用（「自動退室」と明記）
  messageTemplate = pointSettings?.exit_notification_template 
    ? pointSettings.exit_notification_template.replace("退室しました", "自動退室しました")
    : "[生徒名]さんが自動退室しました。\n時刻: [現在時刻]";
}
```

#### タグ置換処理を追加

```typescript
// 6. タグを置換してメッセージを作成
const timestamp = new Date().toLocaleString("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const fullMessage = messageTemplate
  .replace(/\[生徒名\]/g, studentName)
  .replace(/\[現在時刻\]/g, timestamp);
```

---

## 📋 動作確認手順

### 前提条件
1. Supabaseにマイグレーションが実行済みであること
2. LINE Messaging APIが正しく設定されていること
3. 親御さんと生徒が紐づけられていること
4. 親御さんがLINE公式アカウントを友だち追加済みであること

### 1. データベースマイグレーションの実行

Supabaseダッシュボードの**SQL Editor**で以下を実行：

```sql
-- migrations/add_notification_templates_to_point_settings.sql の内容を実行
```

または、Supabase CLIを使用：

```bash
supabase db push
```

#### 確認
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'point_settings' 
AND column_name IN ('entry_notification_template', 'exit_notification_template');
```

### 2. 通知テンプレートの設定

1. 管理画面にアクセス: `http://localhost:3001/admin/settings`
2. 「通知テンプレート」セクションを確認
3. 入室テンプレートを編集（例：`[生徒名]さんが教室に来ました！\n時刻: [現在時刻]`）
4. 退室テンプレートを編集（例：`[生徒名]さんが帰宅しました。\n時刻: [現在時刻]`）
5. 「保存」ボタンをクリック
6. **期待結果:** 「設定を保存しました」というトーストが表示される

#### データベース確認
```sql
SELECT entry_notification_template, exit_notification_template 
FROM point_settings 
WHERE site_id = 'あなたのSITE_ID';
```

### 3. LINE通知のテスト

#### 入室通知のテスト
1. キオスク画面で生徒が入室（`http://localhost:3001/kiosk/entry`）
2. 親御さんのLINEに通知が届くか確認
3. **期待結果:** 設定したテンプレート通りのメッセージが届く
   - 例：「山田太郎さんが教室に来ました！\n時刻: 2026/01/07 14:30」

#### 退室通知のテスト
1. キオスク画面で生徒が退室（`http://localhost:3001/kiosk/exit`）
2. 親御さんのLINEに通知が届くか確認
3. **期待結果:** 設定したテンプレート通りのメッセージが届く
   - 例：「山田太郎さんが帰宅しました。\n時刻: 2026/01/07 18:00」

### 4. ログの確認

#### サーバーログ
```
[LineNotification] Sending LINE notification for student 山田太郎 (uuid), eventType=entry
[LineNotification] Successfully sent notification to parent xxx (LINE User: Uxxx)
[LineNotification] Successfully sent 1 LINE notification(s) for student 山田太郎
```

#### データベースログ
```sql
SELECT * FROM line_notification_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

- `message_sent`カラムに設定したテンプレート内容が記録されているか確認
- `status`が`success`になっているか確認

---

## 🔧 トラブルシューティング

### エラー: 「設定の保存に失敗しました」

#### 原因1: point_settingsテーブルにカラムが存在しない
```sql
-- カラムの存在確認
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'point_settings';
```

解決策:
```sql
-- マイグレーションを実行
-- migrations/add_notification_templates_to_point_settings.sql
```

#### 原因2: SITE_IDが設定されていない
`.env.local`を確認：
```env
SITE_ID=your-site-uuid-here
```

### エラー: 「通知が届かない」

#### 確認手順
1. **LINE_CHANNEL_ACCESS_TOKENが設定されているか**
   ```env
   LINE_CHANNEL_ACCESS_TOKEN=your-token-here
   ```

2. **親御さんとLINEアカウントが紐づいているか**
   ```sql
   SELECT pla.*, p.name 
   FROM parent_line_accounts pla
   JOIN parents p ON pla.parent_id = p.id
   WHERE pla.is_active = true;
   ```

3. **親御さんと生徒が紐づいているか**
   ```sql
   SELECT ps.*, p.name as parent_name, s.name as student_name
   FROM parent_students ps
   JOIN parents p ON ps.parent_id = p.id
   JOIN students s ON ps.student_id = s.id;
   ```

4. **生徒のroleが'student'になっているか**
   ```sql
   SELECT id, name, role FROM students;
   ```
   - アルバイト（`part_time`）や正社員（`full_time`）には通知が送信されません

### エラー: 「テンプレートが反映されない」

#### 確認手順
1. **データベースに保存されているか**
   ```sql
   SELECT entry_notification_template, exit_notification_template 
   FROM point_settings 
   WHERE site_id = 'your-site-id';
   ```

2. **サーバーを再起動**
   - 開発サーバーを再起動してキャッシュをクリア

3. **ブラウザキャッシュをクリア**
   - Ctrl+Shift+R（Windows）/ Cmd+Shift+R（Mac）でハードリロード

---

## 💡 利用可能なタグ

通知テンプレートで使用できるタグ：

| タグ | 説明 | 例 |
|-----|-----|-----|
| `[生徒名]` | 生徒の名前 | 山田太郎 |
| `[現在時刻]` | 通知送信時刻 | 2026/01/07 14:30 |

### テンプレート例

#### 入室テンプレート
```
🏫 [生徒名]さんが塾に到着しました

到着時刻: [現在時刻]
```

#### 退室テンプレート
```
🏠 [生徒名]さんが塾を出ました

退室時刻: [現在時刻]
お疲れさまでした！
```

---

## 📝 関連ファイル

### 新規作成したファイル
- ✅ `migrations/add_notification_templates_to_point_settings.sql` - マイグレーション

### 修正したファイル
- ✅ `app/api/point-settings/route.ts` - API（GET/PUT）
- ✅ `app/admin/settings/page.tsx` - 設定画面
- ✅ `lib/line-notification-utils.ts` - LINE通知送信処理

### 関連ファイル
- `app/api/access-logs/route.ts` - 入退室ログ作成時に通知送信
- `migrations/create_parent_line_notification_tables.sql` - 親御さん・LINE関連テーブル
- `docs/line-integration-flow.md` - LINE連携フローのドキュメント

---

## ✨ 今後の拡張案

### 1. タグの追加
以下のタグを追加することで、より詳細な通知が可能：

- `[学年]` - 生徒の学年
- `[クラス]` - 生徒のクラス
- `[ポイント]` - 現在のポイント数
- `[入室回数]` - 今月の入室回数

### 2. 条件分岐テンプレート
時間帯や曜日によってメッセージを変える：

```
[時間帯=朝]おはようございます！
[時間帯=夜]お疲れさまです！

[生徒名]さんが入室しました。
時刻: [現在時刻]
```

### 3. 画像・スタンプ対応
LINE Messaging APIの機能を活用：

- 入室時にスタンプを送信
- 画像付きメッセージ

---

## ✅ 修正完了チェックリスト

- [x] マイグレーションファイル作成
- [x] APIエンドポイント更新（GET/PUT）
- [x] 設定画面の保存処理実装
- [x] LINE通知送信処理の修正（テンプレート読み込み・タグ置換）
- [x] リンターエラーがないことを確認
- [ ] データベースマイグレーションの実行
- [ ] 通知テンプレートの設定テスト
- [ ] 入室通知のテスト
- [ ] 退室通知のテスト
- [ ] 通知ログの確認

---

最終更新: 2026年1月7日



