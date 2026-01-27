# LINE通知機能の仕組み - 説明用ドキュメント

## 📋 目次
1. [一般向け説明（非技術者向け）](#一般向け説明非技術者向け)
2. [技術者向け説明](#技術者向け説明)
3. [よくある質問](#よくある質問)

---

## 一般向け説明（非技術者向け）

### 「どういう仕組みなの？」と聞かれたら

**簡潔版（30秒で説明）:**
> 「生徒がNFCカードをタッチすると、自動的にその生徒の親御さんのLINEに通知が届くシステムです。事前に親御さんと生徒を紐づけて、LINE公式アカウントと連携しておく必要があります。」

**詳細版（2-3分で説明）:**

#### 1. 事前準備（初回のみ）
```
① 親御さんをシステムに登録
② 親御さんと生徒を紐づけ
③ 親御さんがLINE公式アカウントを友だち追加
④ システムが親御さんのLINE IDを記録
```

#### 2. 日常的な動作（自動）
```
生徒がNFCカードをタッチ
    ↓
システムが「誰が入室/退室したか」を記録
    ↓
その生徒の親御さんを検索
    ↓
親御さんのLINE IDを取得
    ↓
LINE公式アカウントから通知を送信
    ↓
親御さんのLINEアプリに通知が届く
```

#### 3. 通知メッセージの内容
- デフォルト: 「[生徒名]さんが入室しました。\n時刻: [現在時刻]」
- カスタマイズ可能: 管理画面の「設定」→「通知テンプレート」で変更可能

---

## 技術者向け説明

### システムアーキテクチャ

```
┌─────────────────┐
│  NFCカードタッチ  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  /api/access-logs (POST) │
│  入退室ログ作成API        │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  生徒情報取得            │
│  students テーブル       │
│  role='student' 確認     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  親御さん検索            │
│  parent_students テーブル│
│  (student_id で検索)     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  LINEアカウント取得      │
│  parent_line_accounts   │
│  (parent_id, is_active)  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  通知テンプレート取得     │
│  point_settings テーブル │
│  (entry/exit_template)   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  LINE Messaging API      │
│  POST /v2/bot/message/   │
│  push                    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  送信履歴記録            │
│  line_notification_logs │
└─────────────────────────┘
```

### データベース構造

```sql
-- 生徒テーブル
students
  - id (UUID)
  - name
  - role ('student' | 'part_time' | 'full_time')
  - site_id

-- 親御さんテーブル
parents
  - id (UUID)
  - name
  - phone_number
  - email

-- 親子紐づけテーブル（多対多）
parent_students
  - id (UUID)
  - parent_id (FK → parents.id)
  - student_id (FK → students.id)
  - is_primary (boolean)

-- LINEアカウントテーブル
parent_line_accounts
  - id (UUID)
  - parent_id (FK → parents.id)
  - line_user_id (text) -- LINE User ID
  - line_display_name (text)
  - is_active (boolean) -- true の場合のみ通知送信
  - subscribed_at (timestamp)
  - unsubscribed_at (timestamp)

-- 通知送信履歴テーブル
line_notification_logs
  - id (UUID)
  - site_id
  - access_log_id (FK → access_logs.id)
  - parent_id (FK → parents.id)
  - student_id (FK → students.id)
  - event_type ('entry' | 'exit' | 'forced_exit')
  - line_user_id (text)
  - message_sent (text)
  - status ('success' | 'failed')
  - error_message (text)
  - created_at (timestamp)
```

### コードフロー

#### 1. 入退室ログ作成（`app/api/access-logs/route.ts`）

```typescript
// POST /api/access-logs
export async function POST(req: Request) {
  // 1. リクエストデータを取得
  const { studentId, eventType } = await req.json();
  
  // 2. 生徒情報を取得
  const student = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .single();
  
  // 3. 入退室ログを作成
  const log = await supabase
    .from("access_logs")
    .insert({ student_id: studentId, event_type: eventType });
  
  // 4. 生徒（role='student'）の場合のみ通知処理
  if (student.role === "student" && 
      (eventType === "entry" || eventType === "exit" || eventType === "forced_exit")) {
    await sendLineNotificationToParents(
      siteId,
      studentId,
      eventType,
      log.id,
      student.name
    );
  }
}
```

#### 2. LINE通知送信（`lib/line-notification-utils.ts`）

```typescript
export async function sendLineNotificationToParents(
  siteId: string,
  studentId: string,
  eventType: "entry" | "exit" | "forced_exit",
  accessLogId: string,
  studentName: string
) {
  // 1. Supabase Admin Client（RLSバイパス）
  const supabase = getSupabaseAdmin();
  
  // 2. 親御さんを検索
  const { data: parentStudents } = await supabase
    .from("parent_students")
    .select("parent_id, parents!inner(id, name)")
    .eq("student_id", studentId);
  
  // 3. LINEアカウント情報を取得
  const parentIds = parentStudents.map(ps => ps.parents.id);
  const { data: lineAccounts } = await supabase
    .from("parent_line_accounts")
    .select("line_user_id, is_active")
    .in("parent_id", parentIds)
    .eq("is_active", true);
  
  // 4. 通知テンプレートを取得
  const { data: settings } = await supabase
    .from("point_settings")
    .select("entry_notification_template, exit_notification_template")
    .eq("site_id", siteId)
    .single();
  
  // 5. メッセージを作成
  const template = eventType === "entry" 
    ? settings.entry_notification_template 
    : settings.exit_notification_template;
  const message = template
    .replace(/\[生徒名\]/g, studentName)
    .replace(/\[現在時刻\]/g, new Date().toLocaleString("ja-JP"));
  
  // 6. LINE Messaging APIで送信
  for (const lineAccount of lineAccounts) {
    await sendLineMessage(
      process.env.LINE_CHANNEL_ACCESS_TOKEN!,
      lineAccount.line_user_id,
      message
    );
  }
  
  // 7. 送信履歴を記録
  await supabase.from("line_notification_logs").insert({
    access_log_id: accessLogId,
    parent_id: parentId,
    student_id: studentId,
    event_type: eventType,
    line_user_id: lineAccount.line_user_id,
    message_sent: message,
    status: "success"
  });
}
```

### 重要な技術ポイント

#### 1. RLS（Row Level Security）のバイパス
- **問題**: 匿名キー（`ANON_KEY`）では、RLSポリシーによって`parent_students`や`parent_line_accounts`へのアクセスが制限される
- **解決**: `getSupabaseAdmin()`を使用してサービスロールキー（`SERVICE_ROLE_KEY`）でアクセスし、RLSをバイパス

```typescript
// ❌ 間違い（RLSで制限される）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ✅ 正しい（RLSをバイパス）
const supabase = getSupabaseAdmin();
```

#### 2. 通知送信条件
- `role = 'student'` の場合のみ送信（`part_time`、`full_time`は対象外）
- `eventType` が `'entry'`、`'exit'`、`'forced_exit'` の場合のみ送信
- `parent_line_accounts.is_active = true` の場合のみ送信

#### 3. エラーハンドリング
- LINE通知のエラーは入退室ログ作成を妨げない（非同期処理）
- エラーは`line_notification_logs`テーブルに記録される
- サーバーログにも詳細なエラー情報が記録される

---

## よくある質問

### Q1: なぜ通知が届かないの？

**確認ポイント:**
1. ✅ 親御さんと生徒が紐づいているか（`parent_students`テーブル）
2. ✅ LINEアカウントが連携されているか（`parent_line_accounts`テーブル）
3. ✅ `is_active = true` になっているか
4. ✅ 生徒の`role`が`'student'`になっているか
5. ✅ `LINE_CHANNEL_ACCESS_TOKEN`が正しく設定されているか

### Q2: 通知メッセージをカスタマイズしたい

**方法:**
1. 管理画面 → 「設定」→ 「通知テンプレート」
2. 「入室通知テンプレート」「退室通知テンプレート」を編集
3. `[生徒名]`、`[現在時刻]`のタグが使用可能

### Q3: 複数の親御さんに通知を送りたい

**方法:**
- `parent_students`テーブルに複数の親御さんを紐づける
- 各親御さんがLINE連携していれば、全員に通知が送信される

### Q4: 通知を一時的に停止したい

**方法:**
- `parent_line_accounts`テーブルで該当レコードの`is_active`を`false`に変更
- または、LINE公式アカウントから友だち解除（`unsubscribed_at`が自動記録される）

### Q5: 送信履歴を確認したい

**方法:**
- `line_notification_logs`テーブルを確認
- `status`が`'success'`なら送信成功、`'failed'`なら失敗
- `error_message`にエラー詳細が記録される

---

## 関連ドキュメント

- [LINE公式アカウント連携フロー完全ガイド](./line-integration-flow.md)
- [LINE通知機能 セットアップガイド](./line-notification-setup-guide.md)
- [Webhook（ウェブフック）とは？](./webhook-explanation.md)



