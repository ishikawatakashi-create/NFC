import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getStudentAccessTime, isPastEndTime } from "@/lib/access-time-utils";

/**
 * POST /api/auto-exit
 * 開放時間終了時刻を過ぎた未退室ユーザーを自動的に退室させる
 * 
 * このエンドポイントはVercel Cron Jobsから定期的に呼び出されることを想定
 * 手動実行も可能（管理画面から実行ボタンを追加することも可能）
 */
export async function POST(req: Request) {
  try {
    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が設定されていません" },
        { status: 500 }
      );
    }

    const supabase = getSupabaseAdmin();
    const currentTime = new Date();

    // 1. 在籍中で、最終イベントが「入室（entry）」の生徒を取得
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

    // 2. 各生徒の開放時間を確認し、終了時刻を過ぎている場合は自動退室
    for (const student of studentsInBuilding) {
      const studentRole = (student.role || "student") as
        | "student"
        | "part_time"
        | "full_time";

      // 生徒の開放時間を取得（個別設定優先、属性設定フォールバック）
      const accessTime = await getStudentAccessTime(
        siteId,
        studentRole,
        student.has_custom_access_time || false,
        student.access_start_time,
        student.access_end_time
      );

      // 終了時刻を過ぎているかチェック
      if (!isPastEndTime(accessTime.end_time, currentTime)) {
        // まだ開放時間内の場合はスキップ
        continue;
      }

      // 自動退室ログを作成
      const { data: logData, error: logError } = await supabase
        .from("access_logs")
        .insert([
          {
            site_id: siteId,
            student_id: student.id,
            event_type: "exit",
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

      // 生徒の最終イベント情報を更新
      const { error: updateError } = await supabase
        .from("students")
        .update({
          last_event_type: "exit",
          last_event_timestamp: currentTime.toISOString(),
        })
        .eq("id", student.id)
        .eq("site_id", siteId);

      if (updateError) {
        // ログは作成できたが、更新に失敗した場合は警告のみ
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
    console.error("Auto-exit error:", errorMessage);
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auto-exit
 * 自動退室が必要なユーザー数を確認（デバッグ用）
 */
export async function GET() {
  try {
    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が設定されていません" },
        { status: 500 }
      );
    }

    const supabase = getSupabaseAdmin();
    const currentTime = new Date();

    // 在籍中で、最終イベントが「入室（entry）」の生徒を取得
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
        message: "現在入室中のユーザーはありません",
        inBuildingCount: 0,
        needAutoExitCount: 0,
        students: [],
      });
    }

    // getStudentAccessTimeとisPastEndTimeは既にインポート済み

    const needAutoExit: Array<{
      studentId: string;
      studentName: string;
      endTime: string;
      lastEventTime: string | null;
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

      if (isPastEndTime(accessTime.end_time, currentTime)) {
        needAutoExit.push({
          studentId: String(student.id),
          studentName: student.name,
          endTime: accessTime.end_time,
          lastEventTime: student.last_event_timestamp,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: `入室中: ${studentsInBuilding.length}人、自動退室必要: ${needAutoExit.length}人`,
      inBuildingCount: studentsInBuilding.length,
      needAutoExitCount: needAutoExit.length,
      students: needAutoExit,
      currentTime: currentTime.toISOString(),
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}

