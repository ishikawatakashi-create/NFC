import { NextResponse } from "next/server";
import { addPoints } from "@/lib/point-utils";

// 一括ポイント付与
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // 後方互換性のため、旧形式（studentIds + points）と新形式（assignments）の両方に対応
    const { studentIds, points, assignments, description } = body as {
      studentIds?: string[];
      points?: number;
      assignments?: Array<{ studentId: string; points: number; description?: string }>;
      description?: string;
    };

    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }

    // 新形式（assignments）を優先
    let pointAssignments: Array<{ studentId: string; points: number; description?: string }> = [];

    if (assignments && Array.isArray(assignments) && assignments.length > 0) {
      // 新形式：個別にポイント数を指定
      pointAssignments = assignments;
    } else if (studentIds && Array.isArray(studentIds) && studentIds.length > 0 && points && points > 0) {
      // 旧形式：全員に同じポイント数
      pointAssignments = studentIds.map((studentId) => ({
        studentId,
        points,
        description: description || "一括ポイント付与",
      }));
    } else {
      return NextResponse.json(
        { ok: false, error: "assignments または studentIds + points が必要です" },
        { status: 400 }
      );
    }

    const results: Array<{ studentId: string; success: boolean; error?: string }> = [];

    // 各生徒にポイントを付与
    for (const assignment of pointAssignments) {
      const { studentId, points: studentPoints, description: studentDescription } = assignment;

      if (!studentPoints || studentPoints <= 0) {
        results.push({
          studentId,
          success: false,
          error: "ポイント数は1以上の数値である必要があります",
        });
        continue;
      }

      try {
        const success = await addPoints(
          siteId,
          studentId,
          studentPoints,
          "admin_add",
          studentDescription || description || "一括ポイント付与"
        );

        results.push({
          studentId,
          success,
          error: success ? undefined : "ポイントの追加に失敗しました",
        });
      } catch (e: any) {
        results.push({
          studentId,
          success: false,
          error: e?.message || "ポイントの追加に失敗しました",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      ok: true,
      message: `${successCount}名にポイントを付与しました${failureCount > 0 ? `（${failureCount}名失敗）` : ""}`,
      results,
      successCount,
      failureCount,
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

