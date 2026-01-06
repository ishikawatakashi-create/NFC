-- 既存のポイント履歴から現在のポイント数を再計算する
-- このスクリプトは、point_transactionsテーブルの履歴から各生徒の現在のポイント数を計算して更新します

-- 1. 一時テーブルを作成して、各生徒の現在のポイント数を計算
CREATE TEMP TABLE IF NOT EXISTS calculated_points AS
SELECT 
  student_id,
  SUM(points) as total_points
FROM point_transactions
GROUP BY student_id;

-- 2. studentsテーブルのcurrent_pointsを更新
UPDATE students
SET current_points = COALESCE(
  (SELECT total_points FROM calculated_points WHERE calculated_points.student_id = students.id),
  0
);

-- 3. 一時テーブルを削除
DROP TABLE IF EXISTS calculated_points;

-- 確認用クエリ（実行後、削除してもOK）
-- SELECT id, name, current_points FROM students ORDER BY current_points DESC LIMIT 10;




