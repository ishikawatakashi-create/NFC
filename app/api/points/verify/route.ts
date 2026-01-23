import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminApi } from "@/lib/auth-helpers";

function getSupabase() {
  return getSupabaseAdmin();
}

// ポイント整合性チェック
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const autoFix = searchParams.get("autoFix") === "true";

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

    // チェック対象の生徒を取得
    let studentsQuery = supabase
      .from("students")
      .select("id, name, current_points, site_id")
      .eq("site_id", siteId)
      .eq("role", "student");

    if (studentId) {
      studentsQuery = studentsQuery.eq("id", studentId);
    }

    const { data: students, error: studentsError } = await studentsQuery;

    if (studentsError) {
      return NextResponse.json(
        { ok: false, error: "生徒情報の取得に失敗しました" },
        { status: 500 }
      );
    }

    if (!students || students.length === 0) {
      return NextResponse.json({
        ok: true,
        results: [],
        summary: {
          total: 0,
          correct: 0,
          incorrect: 0,
          fixed: 0,
        },
      });
    }

    const results: Array<{
      studentId: string;
      studentName: string;
      currentPoints: number;
      calculatedPoints: number;
      difference: number;
      isCorrect: boolean;
      fixed?: boolean;
    }> = [];

    let fixedCount = 0;

    // 各生徒のポイントを検証
    for (const student of students) {
      // ポイント履歴から現在のポイント数を計算
      const { data: transactions, error: transactionsError } = await supabase
        .from("point_transactions")
        .select("points")
        .eq("site_id", siteId)
        .eq("student_id", student.id);

      if (transactionsError) {
        results.push({
          studentId: student.id,
          studentName: student.name,
          currentPoints: student.current_points || 0,
          calculatedPoints: student.current_points || 0,
          difference: 0,
          isCorrect: true, // エラー時はスキップ
        });
        continue;
      }

      const calculatedPoints = (transactions || []).reduce(
        (sum, t) => sum + (t.points || 0),
        0
      );

      const currentPoints = student.current_points || 0;
      const difference = calculatedPoints - currentPoints;
      const isCorrect = difference === 0;

      // 不整合がある場合、自動修正が有効なら修正
      let fixed = false;
      if (!isCorrect && autoFix) {
        const { error: updateError } = await supabase
          .from("students")
          .update({ current_points: calculatedPoints })
          .eq("id", student.id)
          .eq("site_id", siteId);

        if (!updateError) {
          fixed = true;
          fixedCount++;
        }
      }

      results.push({
        studentId: student.id,
        studentName: student.name,
        currentPoints,
        calculatedPoints,
        difference,
        isCorrect,
        fixed: autoFix ? fixed : undefined,
      });
    }

    const summary = {
      total: results.length,
      correct: results.filter((r) => r.isCorrect).length,
      incorrect: results.filter((r) => !r.isCorrect).length,
      fixed: fixedCount,
    };

    return NextResponse.json({
      ok: true,
      results,
      summary,
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

// ポイント整合性の修正（個別）
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentId } = body as {
      studentId: string;
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

    if (!studentId) {
      return NextResponse.json(
        { ok: false, error: "studentId は必須です" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // ポイント履歴から現在のポイント数を計算
    const { data: transactions, error: transactionsError } = await supabase
      .from("point_transactions")
      .select("points")
      .eq("site_id", siteId)
      .eq("student_id", studentId);

    if (transactionsError) {
      return NextResponse.json(
        { ok: false, error: "ポイント履歴の取得に失敗しました" },
        { status: 500 }
      );
    }

    const calculatedPoints = (transactions || []).reduce(
      (sum, t) => sum + (t.points || 0),
      0
    );

    // 生徒のポイントを更新
    const { error: updateError } = await supabase
      .from("students")
      .update({ current_points: calculatedPoints })
      .eq("id", studentId)
      .eq("site_id", siteId);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: "ポイントの更新に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "ポイントを修正しました",
      calculatedPoints,
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
