import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminApi } from "@/lib/auth-helpers";

function getSupabase() {
  return getSupabaseAdmin();
}

// ポイント復元
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { backupId, studentIds } = body as {
      backupId: string;
      studentIds?: string[]; // 指定された場合は特定の生徒のみ復元
    };

    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }

    const { admin, response } = await requireAdminApi();
    if (!admin) {
      return response;
    }

    if (!backupId) {
      return NextResponse.json(
        { ok: false, error: "backupId は必須です" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // バックアップを取得
    const { data: backup, error: backupError } = await supabase
      .from("point_backups")
      .select("id, backup_name, snapshot_data")
      .eq("id", backupId)
      .eq("site_id", siteId)
      .single();

    if (backupError || !backup) {
      return NextResponse.json(
        { ok: false, error: "バックアップが見つかりません" },
        { status: 404 }
      );
    }

    const snapshotData = backup.snapshot_data as Array<{
      studentId: string;
      studentName: string;
      currentPoints: number;
    }>;

    if (!Array.isArray(snapshotData)) {
      return NextResponse.json(
        { ok: false, error: "バックアップデータが無効です" },
        { status: 400 }
      );
    }

    // 復元対象をフィルタ
    const restoreTargets = studentIds
      ? snapshotData.filter((s) => studentIds.includes(s.studentId))
      : snapshotData;

    if (restoreTargets.length === 0) {
      return NextResponse.json(
        { ok: false, error: "復元対象の生徒がありません" },
        { status: 400 }
      );
    }

    // 各生徒のポイントを復元
    const results: Array<{ studentId: string; success: boolean; error?: string }> = [];

    for (const target of restoreTargets) {
      const { error: updateError } = await supabase
        .from("students")
        .update({ current_points: target.currentPoints })
        .eq("id", target.studentId)
        .eq("site_id", siteId);

      if (updateError) {
        results.push({
          studentId: target.studentId,
          success: false,
          error: updateError.message,
        });
      } else {
        results.push({
          studentId: target.studentId,
          success: true,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      ok: true,
      message: `${successCount}件のポイントを復元しました${failureCount > 0 ? `（${failureCount}件失敗）` : ""}`,
      results,
      successCount,
      failureCount,
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

// バックアップ削除
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const backupId = searchParams.get("backupId");

    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }

    const { admin, response } = await requireAdminApi();
    if (!admin) {
      return response;
    }

    if (!backupId) {
      return NextResponse.json(
        { ok: false, error: "backupId は必須です" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { error: deleteError } = await supabase
      .from("point_backups")
      .delete()
      .eq("id", backupId)
      .eq("site_id", siteId);

    if (deleteError) {
      return NextResponse.json(
        { ok: false, error: "バックアップの削除に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "バックアップを削除しました",
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
