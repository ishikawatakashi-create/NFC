# 親御さんと生徒の紐づけ問題デバッグガイド

## 🔍 報告された問題

**症状:** 親御さんと生徒を紐づけても、画面更新するたびにリセットされる

---

## ✅ 実施した修正

### 1. キャッシュ回避の強化

**修正ファイル:** `app/admin/parents/page.tsx`

#### 変更内容
- API呼び出しにタイムスタンプパラメータを追加してキャッシュを確実に回避
- `{ cache: "no-store" }`オプションを追加

```typescript
// 修正前
const res = await fetch("/api/parents")

// 修正後
const timestamp = new Date().getTime()
const res = await fetch(`/api/parents?_t=${timestamp}`, { cache: "no-store" })
```

### 2. デバッグログの追加

紐づけ処理の各ステップでログを出力するように変更：

```typescript
// 生徒読み込み時
console.log(`[Parents] Loaded ${parent.students.length} students for parent ${parent.name}`)

// 紐づけ成功時
console.log(`[Parents] Successfully linked student ${studentId} to parent ${linkingParent.id}`)
```

### 3. エラー通知の改善

紐づけ処理の成功・失敗件数を表示するように変更：

```typescript
alert(`生徒を${successCount}件紐付けました`)
// または
alert(`生徒を紐付けました（成功: ${successCount}件、失敗: ${failedCount}件）`)
```

---

## 📋 デバッグ手順

### ステップ1: ブラウザコンソールログの確認

1. ブラウザで親御さん管理画面を開く: `http://localhost:3001/admin/parents`
2. F12キーを押して開発者ツールを開く
3. Consoleタブを選択
4. 以下のログが表示されるか確認：

```
[Parents] Loaded 2 students for parent 山田花子 (uuid-xxx)
```

もし「No students found」と表示される場合は、データベースに保存されていない可能性があります。

### ステップ2: ネットワークタブの確認

1. F12 → Networkタブを選択
2. 親御さんに生徒を紐づける操作を行う
3. 以下のリクエストが表示されるか確認：

#### POSTリクエスト（紐づけ追加）
```
Request: POST /api/parents/{parent-id}/students
Status: 200 OK
Response: {"ok":true,"link":{...}}
```

#### GETリクエスト（再読み込み）
```
Request: GET /api/parents?_t=1704624000000
Status: 200 OK
Response: {"ok":true,"parents":[...]}

Request: GET /api/parents/{parent-id}/students?_t=1704624000001
Status: 200 OK
Response: {"ok":true,"students":[...]}
```

### ステップ3: データベースの直接確認

Supabase ダッシュボードで以下のSQLを実行：

#### 親御さんと生徒の紐づけを確認
```sql
SELECT 
  ps.id as link_id,
  p.name as parent_name,
  s.name as student_name,
  ps.is_primary,
  ps.created_at
FROM parent_students ps
JOIN parents p ON ps.parent_id = p.id
JOIN students s ON ps.student_id = s.id
ORDER BY ps.created_at DESC
LIMIT 20;
```

**期待される結果:**
```
link_id      | parent_name | student_name | is_primary | created_at
-------------|-------------|--------------|------------|------------------------
uuid-xxx     | 山田花子    | 山田太郎     | false      | 2026-01-07 15:30:00+00
```

もしデータが存在しない場合は、POSTリクエストが失敗している可能性があります。

#### 全ての親御さんを確認
```sql
SELECT 
  p.id,
  p.name,
  p.site_id,
  p.email,
  COUNT(ps.id) as student_count
FROM parents p
LEFT JOIN parent_students ps ON p.id = ps.parent_id
GROUP BY p.id, p.name, p.site_id, p.email
ORDER BY p.created_at DESC;
```

### ステップ4: RLSポリシーの確認

親御さんと生徒の紐づけテーブル（`parent_students`）にRLSポリシーが正しく設定されているか確認：

```sql
SELECT * FROM pg_policies 
WHERE tablename = 'parent_students';
```

**期待される結果:**
- 管理者（`is_admin()`）が全操作可能なポリシーが存在すること
- ポリシーが有効になっていること（`WITH CHECK` と `USING` が設定されている）

#### RLSポリシーの修正（必要な場合）
```sql
-- parent_studentsテーブルのRLSを有効化
ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;

-- 管理者用ポリシー
DROP POLICY IF EXISTS "Admins can manage parent_students" ON parent_students;
CREATE POLICY "Admins can manage parent_students" ON parent_students
  FOR ALL
  USING (true)  -- 一時的に全アクセス許可（デバッグ用）
  WITH CHECK (true);
```

---

## 🔧 トラブルシューティング

### 問題1: POSTリクエストが失敗する（400/500エラー）

#### 原因
- `studentId`が正しくない
- `parent_id`が存在しない
- SITE_IDが一致しない

#### 確認方法
```sql
-- 生徒が存在するか確認
SELECT id, name, site_id FROM students WHERE id = 'xxx';

-- 親御さんが存在するか確認
SELECT id, name, site_id FROM parents WHERE id = 'xxx';

-- SITE_IDを確認
SELECT * FROM students LIMIT 5;
SELECT * FROM parents LIMIT 5;
```

### 問題2: POSTは成功するがGETで取得できない

#### 原因
- RLSポリシーで読み取りが拒否されている
- `students.site_id`のフィルタリングが機能していない

#### 確認方法
```sql
-- RLSを一時的に無効化してテスト（管理者権限必要）
ALTER TABLE parent_students DISABLE ROW LEVEL SECURITY;

-- 再度APIで確認
-- 成功したら、RLSポリシーの問題

-- RLSを再度有効化
ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;
```

#### 解決策
```sql
-- parent_studentsテーブルのRLSポリシーを修正
DROP POLICY IF EXISTS "Admins can manage parent_students" ON parent_students;
CREATE POLICY "Admins can manage parent_students" ON parent_students
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM parents
      WHERE parents.id = parent_students.parent_id
      -- site_idチェックをここに追加する場合
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM parents
      WHERE parents.id = parent_students.parent_id
    )
  );
```

### 問題3: データは保存されているが画面に表示されない

#### 原因
- フロントエンドの状態管理の問題
- `loadParents()`が正しく実行されていない

#### 確認方法
1. ブラウザコンソールで`loadParents()`が呼ばれているか確認
2. `setParents(apiParents)`の前に`console.log(apiParents)`を追加

#### 解決策
- ブラウザのハードリロード（Ctrl+Shift+R）
- ブラウザキャッシュをクリア

### 問題4: 特定の生徒だけ紐づけられない

#### 原因
- 生徒の`site_id`が親御さんと異なる
- 生徒が存在しない

#### 確認方法
```sql
-- 生徒と親御さんのsite_idを確認
SELECT 
  s.id as student_id,
  s.name as student_name,
  s.site_id as student_site_id,
  p.id as parent_id,
  p.name as parent_name,
  p.site_id as parent_site_id
FROM students s
CROSS JOIN parents p
WHERE s.id = 'student-xxx' AND p.id = 'parent-xxx';
```

---

## 📊 期待される動作フロー

### 正常な紐づけフロー

1. **ユーザーがアクション**
   - 親御さん一覧で「生徒を紐付け」ボタンをクリック

2. **ダイアログ表示**
   - 生徒一覧が表示される
   - 既に紐づいている生徒はチェックされている

3. **生徒を選択**
   - チェックボックスで生徒を選択
   - 「紐付け」ボタンをクリック

4. **APIリクエスト（複数）**
   ```
   POST /api/parents/{parent-id}/students
   Body: {"studentId": "xxx", "isPrimary": false}
   Response: {"ok": true, "link": {...}}
   ```

5. **データベースに保存**
   ```sql
   INSERT INTO parent_students (parent_id, student_id, is_primary)
   VALUES ('parent-uuid', 'student-uuid', false);
   ```

6. **画面更新**
   ```
   GET /api/parents?_t=1704624000000
   GET /api/parents/{parent-id}/students?_t=1704624000001
   ```

7. **UIに反映**
   - 親御さん一覧に生徒名が表示される
   - 「生徒を紐付け」ダイアログでチェックされている

---

## ✅ 修正後の確認チェックリスト

- [ ] ブラウザコンソールにログが表示される
- [ ] ネットワークタブでPOSTリクエストが200 OKで成功
- [ ] ネットワークタブでGETリクエストが200 OKで成功
- [ ] データベースに`parent_students`レコードが作成される
- [ ] 親御さん一覧に生徒名が表示される
- [ ] ページリロード（F5）しても生徒名が表示される
- [ ] 別のブラウザ/シークレットモードでも表示される

---

## 🚀 暫定回避策

問題が解決しない場合、以下の暫定回避策を試してください：

### 方法1: 直接SQLで紐づけ
```sql
-- Supabaseダッシュボードで実行
INSERT INTO parent_students (parent_id, student_id, is_primary)
VALUES (
  (SELECT id FROM parents WHERE name = '親御さんの名前' LIMIT 1),
  (SELECT id FROM students WHERE name = '生徒の名前' LIMIT 1),
  false
);
```

### 方法2: APIを直接呼び出し
```javascript
// ブラウザコンソールで実行
const parentId = 'parent-uuid-here';
const studentId = 'student-uuid-here';

fetch(`/api/parents/${parentId}/students`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ studentId, isPrimary: false })
})
.then(res => res.json())
.then(data => console.log('Result:', data));
```

---

最終更新: 2026年1月7日

