# LINE通知が送信されない問題 - デバッグチェックリスト

## ✅ 現在の状態

- ✅ Webhookは動作している（LINE友だち一覧が取得できている）
- ✅ 親御さんと生徒の紐づけ完了（`parent_students`テーブル）
- ✅ 親御さんとLINEアカウントの紐づけ完了（`parent_line_accounts`テーブル）
- ✅ 管理画面で「連携済み」と表示される
- ❌ 入退室時にLINE通知が送信されない

---

## 🔍 デバッグ手順

### ステップ1: 環境変数の確認

`.env.local`に以下が設定されているか確認：

```env
LINE_CHANNEL_ACCESS_TOKEN=your-channel-access-token-here
```

**確認方法:**
```bash
# PowerShellで確認
Get-Content .env.local | Select-String "LINE_CHANNEL_ACCESS_TOKEN"
```

**期待される結果:**
```
LINE_CHANNEL_ACCESS_TOKEN=長いトークン文字列
```

もし設定されていない、または空の場合：
```
[LineNotification] LINE_CHANNEL_ACCESS_TOKEN is not set. Skipping LINE notification.
```
というログが出力されます。

---

### ステップ2: 生徒のroleを確認

LINE通知は`role = 'student'`の生徒にのみ送信されます。

**確認SQL:**
```sql
SELECT id, name, role 
FROM students 
WHERE name = '石川竜志';
```

**期待される結果:**
```
id                                   | name   | role
-------------------------------------|--------|--------
student-uuid-here                    | 石川竜志 | student
```

もし`role`が`part_time`や`full_time`の場合、通知は送信されません。

**修正SQL:**
```sql
UPDATE students 
SET role = 'student' 
WHERE name = '石川竜志';
```

---

### ステップ3: 入退室操作を実行してログを確認

#### 3-1. 入室操作
1. キオスク画面を開く: `http://localhost:3001/kiosk/entry`
2. 「スキャン開始」をクリック
3. NFCカードをタッチ（または手動で入室ログを作成）

#### 3-2. サーバーログを確認

ターミナルで以下のログが表示されるか確認：

**正常な場合:**
```
[LineNotification] Sending LINE notification for student 石川竜志 (student-uuid), eventType=entry
[LineNotification] Successfully sent notification to parent c550d6fc-c791-4c77-9926-8c2e44318b4b (LINE User: U18e99fc3ceb9ef21c6e3ea5caeef6e0b)
[LineNotification] Successfully sent 1 LINE notification(s) for student 石川竜志
```

**問題がある場合のログパターン:**

##### パターン1: LINE_CHANNEL_ACCESS_TOKENが未設定
```
[LineNotification] LINE_CHANNEL_ACCESS_TOKEN is not set. Skipping LINE notification.
```
→ `.env.local`を確認

##### パターン2: 親御さんが見つからない
```
[LineNotification] No parents found for student student-uuid. Skipping notification.
```
→ `parent_students`テーブルを確認

##### パターン3: LINEアカウントが見つからない
```
[LineNotification] No active LINE accounts found for student student-uuid. Skipping notification.
```
→ `parent_line_accounts`テーブルを確認

##### パターン4: LINE API エラー
```
[LineNotification] Failed to send notification to parent xxx (LINE User: Uxxx): LINE API error: 401 Unauthorized
```
→ `LINE_CHANNEL_ACCESS_TOKEN`が間違っている

##### パターン5: roleが'student'ではない
```
(ログが一切出力されない)
```
→ 生徒の`role`を確認

---

### ステップ4: データベースで詳細確認

#### 4-1. 生徒と親御さんの紐づけを確認
```sql
SELECT 
  s.id as student_id,
  s.name as student_name,
  s.role as student_role,
  ps.parent_id,
  p.name as parent_name
FROM students s
LEFT JOIN parent_students ps ON s.id = ps.student_id
LEFT JOIN parents p ON ps.parent_id = p.id
WHERE s.name = '石川竜志';
```

**期待される結果:**
```
student_id    | student_name | student_role | parent_id     | parent_name
--------------|--------------|--------------|---------------|-------------
uuid-xxx      | 石川竜志      | student      | uuid-yyy      | たかしまま
```

#### 4-2. 親御さんとLINEアカウントの紐づけを確認
```sql
SELECT 
  p.id as parent_id,
  p.name as parent_name,
  pla.line_user_id,
  pla.is_active
FROM parents p
LEFT JOIN parent_line_accounts pla ON p.id = pla.parent_id
WHERE p.name = 'たかしまま';
```

**期待される結果:**
```
parent_id     | parent_name | line_user_id                      | is_active
--------------|-------------|-----------------------------------|----------
uuid-yyy      | たかしまま   | U18e99fc3ceb9ef21c6e3ea5caeef6e0b | true
```

#### 4-3. 通知ログを確認
```sql
SELECT 
  lnl.id,
  lnl.event_type,
  lnl.message_sent,
  lnl.status,
  lnl.error_message,
  lnl.created_at,
  s.name as student_name,
  p.name as parent_name
FROM line_notification_logs lnl
JOIN students s ON lnl.student_id = s.id
JOIN parents p ON lnl.parent_id = p.id
ORDER BY lnl.created_at DESC
LIMIT 10;
```

**期待される結果（通知が送信された場合）:**
```
id       | event_type | message_sent                        | status  | error_message | created_at              | student_name | parent_name
---------|------------|-------------------------------------|---------|---------------|-------------------------|--------------|-------------
uuid-xxx | entry      | 石川竜志さんが入室しました。\n時刻: ... | success | (null)        | 2026-01-07 16:30:00+00 | 石川竜志      | たかしまま
```

もしレコードが存在しない場合、通知処理が実行されていません。

---

### ステップ5: 手動でAPIを呼び出してテスト

ブラウザコンソール（F12 → Console）で以下を実行：

```javascript
// 入室ログを作成（通知も送信される）
const response = await fetch('/api/access-logs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    studentId: 'student-uuid-here',  // 石川竜志のID
    cardId: 'test-card-id',
    deviceId: 'manual-test',
    eventType: 'entry',
    notificationStatus: 'not_required'
  })
})
const data = await response.json()
console.log('Result:', data)
```

サーバーログを確認して、`[LineNotification]`のログが出力されるか確認。

---

### ステップ6: LINE Messaging APIの動作確認

#### 6-1. チャネルアクセストークンの確認

LINE Developers Console → 該当チャネル → Messaging API設定：
- **チャネルアクセストークン（長期）** が発行されているか確認
- `.env.local`の値と一致しているか確認

#### 6-2. 手動でLINEメッセージを送信してテスト

ブラウザコンソールで以下を実行：

```javascript
// LINE APIに直接リクエスト（テスト用）
const token = 'your-line-channel-access-token'
const userId = 'U18e99fc3ceb9ef21c6e3ea5caeef6e0b'

const response = await fetch('https://api.line.me/v2/bot/message/push', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    to: userId,
    messages: [{
      type: 'text',
      text: 'テストメッセージです'
    }]
  })
})

console.log('Status:', response.status)
const data = await response.json()
console.log('Response:', data)
```

**期待される結果:**
- Status: 200
- Response: `{}`（空のオブジェクト = 成功）

**エラーの場合:**
- Status: 401 → トークンが間違っている
- Status: 400 → リクエストが間違っている
- Status: 403 → ユーザーがブロックしている

---

## 🔧 よくある問題と解決策

### 問題1: LINE_CHANNEL_ACCESS_TOKENが未設定

**症状:**
```
[LineNotification] LINE_CHANNEL_ACCESS_TOKEN is not set. Skipping LINE notification.
```

**解決策:**
1. LINE Developers Console → 該当チャネル → Messaging API設定
2. 「チャネルアクセストークン（長期）」を発行
3. `.env.local`に追加：
   ```env
   LINE_CHANNEL_ACCESS_TOKEN=your-token-here
   ```
4. サーバーを再起動

---

### 問題2: 生徒のroleが'student'ではない

**症状:**
- サーバーログに`[LineNotification]`が一切出力されない

**解決策:**
```sql
UPDATE students 
SET role = 'student' 
WHERE name = '石川竜志';
```

---

### 問題3: 親御さんとの紐づけが不完全

**症状:**
```
[LineNotification] No parents found for student xxx
```

**解決策:**
```sql
-- 紐づけを確認
SELECT * FROM parent_students 
WHERE student_id = 'student-uuid-here';

-- 紐づけがない場合は作成
INSERT INTO parent_students (parent_id, student_id, is_primary)
VALUES ('parent-uuid-here', 'student-uuid-here', true);
```

---

### 問題4: LINEアカウントが無効

**症状:**
```
[LineNotification] No active LINE accounts found for student xxx
```

**解決策:**
```sql
-- is_activeを確認
SELECT * FROM parent_line_accounts 
WHERE parent_id = 'parent-uuid-here';

-- falseの場合はtrueに更新
UPDATE parent_line_accounts 
SET is_active = true 
WHERE parent_id = 'parent-uuid-here';
```

---

### 問題5: LINE APIエラー（401 Unauthorized）

**症状:**
```
[LineNotification] Failed to send notification: LINE API error: 401 Unauthorized
```

**解決策:**
1. LINE Developers Console でトークンを再発行
2. `.env.local`を更新
3. サーバーを再起動

---

### 問題6: ユーザーがボットをブロックしている

**症状:**
```
[LineNotification] Failed to send notification: LINE API error: 403 Forbidden
```

**解決策:**
1. 親御さんにLINE公式アカウントのブロックを解除してもらう
2. 再度友だち追加

---

## ✅ チェックリスト

デバッグ時に以下を順番に確認：

- [ ] `.env.local`に`LINE_CHANNEL_ACCESS_TOKEN`が設定されている
- [ ] 生徒の`role`が`student`である
- [ ] `parent_students`テーブルに紐づけレコードがある
- [ ] `parent_line_accounts`テーブルに紐づけレコードがある
- [ ] `parent_line_accounts.is_active`が`true`である
- [ ] 入退室操作を実行した
- [ ] サーバーログに`[LineNotification]`が出力される
- [ ] LINE Messaging APIのトークンが正しい
- [ ] ユーザーがボットをブロックしていない

---

最終更新: 2026年1月7日



