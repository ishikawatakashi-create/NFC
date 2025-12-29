import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ポイント履歴取得
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const transactionType = searchParams.get("type");

    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }

    if (!studentId) {
      return NextResponse.json({ ok: false, error: "studentId は必須です" }, { status: 400 });
    }

    const supabase = getSupabase();

    let query = supabase
      .from("point_transactions")
      .select(`
        id,
        transaction_type,
        points,
        description,
        reference_id,
        created_at,
        students!inner(id, name)
      `)
      .eq("site_id", siteId)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1000);

    // 日付範囲フィルタ
    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    // 種別フィルタ
    if (transactionType && transactionType !== "all") {
      query = query.eq("transaction_type", transactionType);
    }

    const { data, error } = await query;

    if (error) {
      const errorMessage = error.message || String(error);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    const transactions = (data || []).map((transaction: any) => ({
      id: String(transaction.id),
      transactionType: transaction.transaction_type,
      points: transaction.points,
      description: transaction.description || null,
      referenceId: transaction.reference_id ? String(transaction.reference_id) : null,
      createdAt: transaction.created_at,
    }));

    return NextResponse.json({ ok: true, transactions });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

