import { NextResponse } from "next/server";
import { consumePoints } from "@/lib/point-utils";
import { requireAdminApi } from "@/lib/auth-helpers";

// 一括ポイント減算
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { assignments } = body as {
      assignments: Array<{ studentId: string; points: number; description?: string }>;
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

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json(
        { ok: false, error: "assignments が必要です" },
        { status: 400 }
      );
    }

    const results: Array<{ studentId: string; success: boolean; error?: string }> = [];

    // 各生徒からポイントを減算
    for (const assignment of assignments) {
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
        const result = await consumePoints(
          siteId,
          studentId,
          studentPoints,
          studentDescription || "一括ポイント減算",
          admin.id
        );

        results.push({
          studentId,
          success: result.success,
          error: result.error,
        });
      } catch (e: any) {
        results.push({
          studentId,
          success: false,
          error: e?.message || "ポイントの減算に失敗しました",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      ok: true,
      message: `${successCount}名からポイントを減算しました${failureCount > 0 ? `（${failureCount}名失敗）` : ""}`,
      results,
      successCount,
      failureCount,
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
