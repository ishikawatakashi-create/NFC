import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminApi } from "@/lib/auth-helpers";

function getSupabase() {
  return getSupabaseAdmin();
}

// ポイント統計取得
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "month"; // day, week, month, year
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

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

    // 期間の決定
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date = now;

    if (startDate && endDate) {
      periodStart = new Date(startDate);
      periodEnd = new Date(endDate);
    } else {
      switch (period) {
        case "day":
          periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "week":
          const dayOfWeek = now.getDay();
          periodStart = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
          periodStart.setHours(0, 0, 0, 0);
          break;
        case "month":
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "year":
          periodStart = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      }
    }

    const periodStartISO = periodStart.toISOString();
    const periodEndISO = periodEnd.toISOString();

    // 1. ポイント履歴を取得
    const { data: transactions, error: transactionsError } = await supabase
      .from("point_transactions")
      .select("transaction_type, points, created_at")
      .eq("site_id", siteId)
      .gte("created_at", periodStartISO)
      .lte("created_at", periodEndISO);

    if (transactionsError) {
      return NextResponse.json(
        { ok: false, error: "ポイント履歴の取得に失敗しました" },
        { status: 500 }
      );
    }

    // 2. 入室ログを取得（ポイント獲得率の計算用）
    const { data: accessLogs, error: accessLogsError } = await supabase
      .from("access_logs")
      .select("id, timestamp, student_id")
      .eq("site_id", siteId)
      .eq("event_type", "entry")
      .gte("timestamp", periodStartISO)
      .lte("timestamp", periodEndISO);

    if (accessLogsError) {
      return NextResponse.json(
        { ok: false, error: "入室ログの取得に失敗しました" },
        { status: 500 }
      );
    }

    // 3. 統計を計算
    const stats = {
      totalAwarded: 0, // 総獲得ポイント
      totalConsumed: 0, // 総消費ポイント
      entryPoints: 0, // 入室ポイント
      bonusPoints: 0, // ボーナスポイント
      adminAdded: 0, // 管理追加
      adminSubtracted: 0, // 管理減算
      consumption: 0, // 消費
      entryCount: 0, // 入室回数
      transactionCount: (transactions || []).length,
      averagePointsPerEntry: 0, // 入室1回あたりの平均ポイント
      pointAwardRate: 0, // ポイント獲得率（入室に対する獲得率）
    };

    (transactions || []).forEach((transaction) => {
      const points = transaction.points || 0;
      if (points > 0) {
        stats.totalAwarded += points;
        switch (transaction.transaction_type) {
          case "entry":
            stats.entryPoints += points;
            break;
          case "bonus":
            stats.bonusPoints += points;
            break;
          case "admin_add":
            stats.adminAdded += points;
            break;
        }
      } else {
        stats.totalConsumed += Math.abs(points);
        switch (transaction.transaction_type) {
          case "admin_subtract":
            stats.adminSubtracted += Math.abs(points);
            break;
          case "consumption":
            stats.consumption += Math.abs(points);
            break;
        }
      }
    });

    stats.entryCount = (accessLogs || []).length;
    stats.averagePointsPerEntry =
      stats.entryCount > 0 ? Math.round((stats.totalAwarded / stats.entryCount) * 100) / 100 : 0;
    stats.pointAwardRate =
      stats.entryCount > 0 ? Math.round((stats.entryCount / stats.entryCount) * 100) : 0;

    // 4. 日別統計（期間が長い場合）
    const dailyStats: Array<{
      date: string;
      awarded: number;
      consumed: number;
      entryCount: number;
    }> = [];

    if (period === "month" || period === "year" || (startDate && endDate)) {
      const dateMap = new Map<string, { awarded: number; consumed: number; entryCount: number }>();

      (transactions || []).forEach((transaction) => {
        const date = new Date(transaction.created_at).toISOString().split("T")[0];
        if (!dateMap.has(date)) {
          dateMap.set(date, { awarded: 0, consumed: 0, entryCount: 0 });
        }
        const dayData = dateMap.get(date)!;
        const points = transaction.points || 0;
        if (points > 0) {
          dayData.awarded += points;
        } else {
          dayData.consumed += Math.abs(points);
        }
      });

      (accessLogs || []).forEach((log) => {
        const date = new Date(log.timestamp).toISOString().split("T")[0];
        if (!dateMap.has(date)) {
          dateMap.set(date, { awarded: 0, consumed: 0, entryCount: 0 });
        }
        dateMap.get(date)!.entryCount++;
      });

      dailyStats.push(
        ...Array.from(dateMap.entries())
          .map(([date, data]) => ({
            date,
            ...data,
          }))
          .sort((a, b) => a.date.localeCompare(b.date))
      );
    }

    return NextResponse.json({
      ok: true,
      statistics: stats,
      dailyStats,
      period: {
        start: periodStartISO,
        end: periodEndISO,
        type: period,
      },
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
