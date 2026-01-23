import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminApi } from "@/lib/auth-helpers";

function getSupabase() {
  return getSupabaseAdmin();
}

// ポイントバックアップ作成
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { backupName, description } = body as {
      backupName?: string;
      description?: string;
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

    const supabase = getSupabase();

    // バックアップ名が指定されていない場合は自動生成
    const finalBackupName =
      backupName || `backup_${new Date().toISOString().replace(/[:.]/g, "-")}`;

    // 全生徒のポイント状態を取得
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id, name, current_points")
      .eq("site_id", siteId)
      .eq("role", "student");

    if (studentsError) {
      return NextResponse.json(
        { ok: false, error: "生徒情報の取得に失敗しました" },
        { status: 500 }
      );
    }

    // スナップショットデータを作成
    const snapshotData = (students || []).map((student) => ({
      studentId: student.id,
      studentName: student.name,
      currentPoints: student.current_points || 0,
    }));

    // バックアップを保存
    const { data: backup, error: backupError } = await supabase
      .from("point_backups")
      .insert({
        site_id: siteId,
        backup_name: finalBackupName,
        description: description || null,
        created_by: admin.id,
        snapshot_data: snapshotData,
      })
      .select()
      .single();

    if (backupError) {
      // 重複エラーの場合
      if (backupError.code === "23505") {
        return NextResponse.json(
          { ok: false, error: "同じ名前のバックアップが既に存在します" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { ok: false, error: "バックアップの作成に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "バックアップを作成しました",
      backup: {
        id: backup.id,
        backupName: backup.backup_name,
        description: backup.description,
        createdAt: backup.created_at,
        studentCount: snapshotData.length,
      },
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

// バックアップ一覧取得
export async function GET(req: Request) {
  try {
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

    const supabase = getSupabase();

    const { data: backups, error: backupsError } = await supabase
      .from("point_backups")
      .select(`
        id,
        backup_name,
        description,
        created_at,
        created_by,
        snapshot_data,
        admins:created_by(first_name, last_name)
      `)
      .eq("site_id", siteId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (backupsError) {
      return NextResponse.json(
        { ok: false, error: "バックアップ一覧の取得に失敗しました" },
        { status: 500 }
      );
    }

    const formattedBackups = (backups || []).map((backup: any) => ({
      id: backup.id,
      backupName: backup.backup_name,
      description: backup.description,
      createdAt: backup.created_at,
      createdBy: backup.admins
        ? `${backup.admins.first_name || ""} ${backup.admins.last_name || ""}`.trim()
        : null,
      studentCount: Array.isArray(backup.snapshot_data) ? backup.snapshot_data.length : 0,
    }));

    return NextResponse.json({
      ok: true,
      backups: formattedBackups,
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
