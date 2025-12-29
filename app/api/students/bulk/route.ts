import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRoleBasedAccessTime } from "@/lib/access-time-utils";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// CSV一括登録
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { students } = body as {
      students: Array<{
        name: string;
        role?: string;
        status?: string;
        grade?: string;
        class?: string;
        card_id?: string;
      }>;
    };

    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { ok: false, error: "students 配列が空です" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // 各学生を登録
    for (let i = 0; i < students.length; i++) {
      const student = students[i];

      // 必須項目チェック
      if (!student.name || !student.role || !student.status) {
        failedCount++;
        errors.push(`行${i + 1}: 必須項目（name, role, status）が不足しています`);
        continue;
      }

      // 属性の検証
      const userRole = student.role as "student" | "part_time" | "full_time";
      if (!["student", "part_time", "full_time"].includes(userRole)) {
        failedCount++;
        errors.push(`行${i + 1}: 属性が不正です（${student.role}）`);
        continue;
      }

      // ステータスの検証
      const status = student.status as "active" | "suspended" | "withdrawn" | "graduated";
      if (!["active", "suspended", "withdrawn", "graduated"].includes(status)) {
        failedCount++;
        errors.push(`行${i + 1}: ステータスが不正です（${student.status}）`);
        continue;
      }

      // 属性に紐づいた開放時間を取得
      const roleAccessTime = await getRoleBasedAccessTime(siteId, userRole);

      // クラスの検証
      let studentClass: string | undefined = undefined;
      if (student.class) {
        if (!["kindergarten", "beginner", "challenger", "creator", "innovator"].includes(student.class)) {
          failedCount++;
          errors.push(`行${i + 1}: クラスが不正です（${student.class}）`);
          continue;
        }
        studentClass = student.class;
      }

      // 挿入データの準備
      const insertData: any = {
        site_id: siteId,
        name: student.name.trim(),
        grade: student.grade?.trim() || null,
        status: status,
        role: userRole,
      };

      if (studentClass) {
        insertData.class = studentClass;
      }

      if (student.card_id) {
        insertData.card_id = student.card_id.trim();
      }

      // 属性に紐づいた開放時間を個別設定カラムに設定
      if (roleAccessTime) {
        insertData.access_start_time = roleAccessTime.start_time;
        insertData.access_end_time = roleAccessTime.end_time;
        insertData.has_custom_access_time = false; // 新規登録時は属性設定を使用
      }

      // データベースに挿入
      let { error } = await supabase.from("students").insert([insertData]);

      // カラムが存在しない場合は、存在するカラムのみで再試行
      if (error && (error.message?.includes("column students.class does not exist") ||
                    error.message?.includes("column students.role does not exist") ||
                    error.message?.includes("column students.card_id does not exist") ||
                    error.message?.includes("column students.access_start_time does not exist"))) {
        const insertDataFallback: any = {
          site_id: siteId,
          name: insertData.name,
          grade: insertData.grade,
          status: insertData.status,
        };

        const { error: errorFallback } = await supabase
          .from("students")
          .insert([insertDataFallback]);

        if (errorFallback) {
          failedCount++;
          const errorMessage = errorFallback.message || String(errorFallback);
          errors.push(`行${i + 1}: ${errorMessage}`);
          continue;
        }
      } else if (error) {
        failedCount++;
        const errorMessage = error.message || String(error);
        errors.push(`行${i + 1}: ${errorMessage}`);
        continue;
      }

      successCount++;
    }

    return NextResponse.json({
      ok: true,
      success: successCount,
      failed: failedCount,
      errors: errors.slice(0, 50), // エラーは最大50件まで返す
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}





