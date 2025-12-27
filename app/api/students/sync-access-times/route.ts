import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRoleBasedAccessTime } from "@/lib/access-time-utils";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * 開始時刻・終了時刻が未設定のユーザーに対して、属性に紐づいた開放時間を自動設定する
 */
export async function POST(req: Request) {
  try {
    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }

    const supabase = getSupabase();

    // 開始時刻・終了時刻が未設定、または個別設定がないユーザーを取得
    const { data: students, error: fetchError } = await supabase
      .from("students")
      .select("id, role, access_start_time, access_end_time, has_custom_access_time")
      .eq("site_id", siteId)
      .or("access_start_time.is.null,access_end_time.is.null,has_custom_access_time.eq.false");

    if (fetchError) {
      const errorMessage = fetchError.message || String(fetchError);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    if (!students || students.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "更新が必要なユーザーはありません",
        updatedCount: 0,
      });
    }

    let updatedCount = 0;
    const errors: string[] = [];

    // 各ユーザーに対して属性に紐づいた開放時間を設定
    for (const student of students) {
      // 個別設定がある場合はスキップ
      if (student.has_custom_access_time === true) {
        continue;
      }

      // 属性が設定されていない場合はスキップ
      if (!student.role) {
        continue;
      }

      // 属性に紐づいた開放時間を取得
      const roleAccessTime = await getRoleBasedAccessTime(
        siteId,
        student.role as "student" | "part_time" | "full_time"
      );

      if (!roleAccessTime) {
        errors.push(`ユーザー ${student.id}: 属性に紐づいた開放時間の取得に失敗しました`);
        continue;
      }

      // 更新
      const { error: updateError } = await supabase
        .from("students")
        .update({
          access_start_time: roleAccessTime.start_time,
          access_end_time: roleAccessTime.end_time,
          has_custom_access_time: false,
        })
        .eq("id", student.id)
        .eq("site_id", siteId);

      if (updateError) {
        errors.push(`ユーザー ${student.id}: ${updateError.message}`);
      } else {
        updatedCount++;
      }
    }

    return NextResponse.json({
      ok: true,
      message: `${updatedCount}件のユーザーを更新しました`,
      updatedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

