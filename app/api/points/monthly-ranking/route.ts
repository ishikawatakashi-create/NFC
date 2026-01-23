import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth-helpers";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function getSupabase() {
  return getSupabaseAdmin();
}

// 月間ランキング取得（一括）
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");

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

    // 年月の決定（指定がない場合は今月）
    const now = new Date();
    const targetYear = year ? parseInt(year, 10) : now.getFullYear();
    const targetMonth = month ? parseInt(month, 10) - 1 : now.getMonth();

    const monthStart = new Date(targetYear, targetMonth, 1);
    const monthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
    const monthStartISO = monthStart.toISOString();
    const monthEndISO = monthEnd.toISOString();

    // 全生徒を取得
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id, name, class, role")
      .eq("site_id", siteId)
      .eq("role", "student");

    if (studentsError) {
      return NextResponse.json(
        { ok: false, error: "生徒情報の取得に失敗しました" },
        { status: 500 }
      );
    }

    if (!students || students.length === 0) {
      return NextResponse.json({
        ok: true,
        rankings: [],
      });
    }

    const studentIds = students.map((s) => s.id);

    // 指定期間内の全ポイント履歴を一括取得
    const { data: transactions, error: transactionsError } = await supabase
      .from("point_transactions")
      .select("student_id, points")
      .eq("site_id", siteId)
      .in("student_id", studentIds)
      .gte("created_at", monthStartISO)
      .lte("created_at", monthEndISO);

    if (transactionsError) {
      return NextResponse.json(
        { ok: false, error: "ポイント履歴の取得に失敗しました" },
        { status: 500 }
      );
    }

    // 生徒ごとにポイントを集計
    const monthlyPointsMap = new Map<string, number>();
    (transactions || []).forEach((transaction) => {
      const studentId = transaction.student_id;
      const current = monthlyPointsMap.get(studentId) || 0;
      monthlyPointsMap.set(studentId, current + (transaction.points || 0));
    });

    // ランキングデータを作成
    const rankings = students
      .map((student) => ({
        id: student.id,
        name: student.name,
        class: student.class,
        monthlyPoints: monthlyPointsMap.get(student.id) || 0,
      }))
      .sort((a, b) => b.monthlyPoints - a.monthlyPoints);

    return NextResponse.json({
      ok: true,
      rankings,
      period: {
        year: targetYear,
        month: targetMonth + 1,
        startDate: monthStartISO,
        endDate: monthEndISO,
      },
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
