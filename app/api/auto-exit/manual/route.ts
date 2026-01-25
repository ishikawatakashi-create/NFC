import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getStudentAccessTime, hasAccessWindowBetween } from "@/lib/access-time-utils";
import { requireAdminApi } from "@/lib/auth-helpers";

/**
 * POST /api/auto-exit/manual
 * 管理画面から手動で自動退室処理を実行する
 */
export async function POST() {
  try {
    const { admin, response } = await requireAdminApi();
    if (!admin) {
      return response;
    }

    const siteId = process.env.SITE_ID;
    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が設定されていません" },
        { status: 500 }
      );
    }

    const supabase = getSupabaseAdmin();
    const currentTime = new Date();

    const { data: studentsInBuilding, error: fetchError } = await supabase
      .from("students")
      .select(
        "id, name, role, has_custom_access_time, access_start_time, access_end_time, last_event_type, last_event_timestamp"
      )
      .eq("site_id", siteId)
      .eq("status", "active")
      .eq("last_event_type", "entry");

    if (fetchError) {
      const errorMessage = fetchError.message || String(fetchError);
      return NextResponse.json(
        { ok: false, error: `生徒情報の取得に失敗しました: ${errorMessage}` },
        { status: 500 }
      );
    }

    if (!studentsInBuilding || studentsInBuilding.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "自動退室が必要なユーザーはありません",
        processedCount: 0,
        students: [],
      });
    }

    const processedStudents: Array<{
      studentId: string;
      studentName: string;
      endTime: string;
      exited: boolean;
      error?: string;
    }> = [];

    for (const student of studentsInBuilding) {
      const studentRole = (student.role || "student") as
        | "student"
        | "part_time"
        | "full_time";

      const accessTime = await getStudentAccessTime(
        siteId,
        studentRole,
        student.has_custom_access_time || false,
        student.access_start_time,
        student.access_end_time
      );

      const shouldExit = hasAccessWindowBetween(
        student.last_event_timestamp,
        currentTime,
        accessTime.start_time,
        accessTime.end_time
      );
      if (!shouldExit) {
        continue;
      }

      const { data: logData, error: logError } = await supabase
        .from("access_logs")
        .insert([
          {
            site_id: siteId,
            student_id: student.id,
            event_type: "forced_exit",
            card_id: null,
            device_id: "auto-exit-system",
            notification_status: "not_required",
          },
        ])
        .select()
        .single();

      if (logError) {
        processedStudents.push({
          studentId: String(student.id),
          studentName: student.name,
          endTime: accessTime.end_time,
          exited: false,
          error: logError.message || "ログの作成に失敗しました",
        });
        continue;
      }

      const { error: updateError } = await supabase
        .from("students")
        .update({
          last_event_type: "exit",
          last_event_timestamp: currentTime.toISOString(),
        })
        .eq("id", student.id)
        .eq("site_id", siteId);

      if (updateError) {
        console.warn(
          `Failed to update student last event for ${student.name}:`,
          updateError
        );
      }

      processedStudents.push({
        studentId: String(student.id),
        studentName: student.name,
        endTime: accessTime.end_time,
        exited: true,
      });
    }

    const exitedCount = processedStudents.filter((s) => s.exited).length;

    return NextResponse.json({
      ok: true,
      message: `${exitedCount}人の自動退室を処理しました`,
      processedCount: exitedCount,
      totalChecked: studentsInBuilding.length,
      students: processedStudents,
      timestamp: currentTime.toISOString(),
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    console.error("Auto-exit manual error:", errorMessage);
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}
