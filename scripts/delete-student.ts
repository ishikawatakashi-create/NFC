/**
 * 生徒を削除するスクリプト
 * 
 * 使用方法:
 * npx tsx scripts/delete-student.ts "Test Card 01 Updated"
 * 
 * または、Node.jsで直接実行:
 * node -r ts-node/register scripts/delete-student.ts "Test Card 01 Updated"
 */

// 環境変数を読み込む（.env.localから）
import { config } from "dotenv";
import { resolve } from "path";

// .env.localファイルを読み込む
config({ path: resolve(process.cwd(), ".env.local") });

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { env } from "@/lib/env";

async function deleteStudentByName(studentName: string) {
  try {
    const supabase = getSupabaseAdmin();
    const siteId = env.SITE_ID;

    console.log(`🔍 生徒を検索中: "${studentName}" (site_id: ${siteId})...`);

    // 生徒を検索
    const { data: students, error: searchError } = await supabase
      .from("students")
      .select("id, name, grade, status, card_id")
      .eq("site_id", siteId)
      .ilike("name", `%${studentName}%`);

    if (searchError) {
      console.error("❌ 検索エラー:", searchError.message);
      process.exit(1);
    }

    if (!students || students.length === 0) {
      console.log(`❌ 生徒が見つかりませんでした: "${studentName}"`);
      process.exit(1);
    }

    if (students.length > 1) {
      console.log(`⚠️  複数の生徒が見つかりました (${students.length}件):`);
      students.forEach((s, i) => {
        console.log(`  ${i + 1}. ID: ${s.id}, 名前: ${s.name}, 学年: ${s.grade || "N/A"}, ステータス: ${s.status}, カードID: ${s.card_id || "N/A"}`);
      });
      console.log("\n完全一致する名前を指定してください。");
      process.exit(1);
    }

    const student = students[0];
    console.log(`\n📋 見つかった生徒:`);
    console.log(`  ID: ${student.id}`);
    console.log(`  名前: ${student.name}`);
    console.log(`  学年: ${student.grade || "N/A"}`);
    console.log(`  ステータス: ${student.status}`);
    console.log(`  カードID: ${student.card_id || "N/A"}`);

    // 完全一致チェック
    if (student.name !== studentName) {
      console.log(`\n⚠️  名前が完全一致しません。`);
      console.log(`  検索: "${studentName}"`);
      console.log(`  見つかった: "${student.name}"`);
      console.log(`\n完全一致する名前を指定するか、この生徒を削除する場合は続行してください。`);
      process.exit(1);
    }

    console.log(`\n🗑️  削除を実行中...`);

    // 生徒を削除
    const { error: deleteError } = await supabase
      .from("students")
      .delete()
      .eq("id", student.id)
      .eq("site_id", siteId);

    if (deleteError) {
      console.error("❌ 削除エラー:", deleteError.message);
      process.exit(1);
    }

    console.log(`✅ 生徒を削除しました: "${student.name}" (ID: ${student.id})`);
  } catch (error: any) {
    console.error("❌ 予期しないエラー:", error.message);
    process.exit(1);
  }
}

// スクリプト実行
const studentName = process.argv[2];

if (!studentName) {
  console.error("❌ 使用方法: npx tsx scripts/delete-student.ts \"生徒名\"");
  console.error("例: npx tsx scripts/delete-student.ts \"Test Card 01 Updated\"");
  process.exit(1);
}

deleteStudentByName(studentName);
