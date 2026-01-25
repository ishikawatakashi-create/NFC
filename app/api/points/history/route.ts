import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth-helpers";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function getSupabase() {
  // Service Role Keyを使用してRLSをバイパス
  return getSupabaseAdmin();
}

// ポイント履歴取得
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const transactionType = searchParams.get("type");
    const searchQuery = searchParams.get("search"); // 検索クエリ（説明文での検索）
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    // ページネーション設定（デフォルト: 最新50件）
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

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

    const applyFilters = (query: any) => {
      if (studentId) {
        query = query.eq("student_id", studentId);
      }

      if (startDate) {
        query = query.gte("created_at", startDate);
      }
      if (endDate) {
        query = query.lte("created_at", endDate);
      }

      if (transactionType && transactionType !== "all") {
        query = query.eq("transaction_type", transactionType);
      }

      if (searchQuery && searchQuery.trim()) {
        query = query.ilike("description", `%${searchQuery.trim()}%`);
      }

      return query;
    };

    let data: any[] | null = null;
    let error: any = null;
    let count: number | null = null;

    let queryWithAdmin = supabase
      .from("point_transactions")
      .select(`
        id,
        transaction_type,
        points,
        description,
        reference_id,
        created_at,
        admin_id,
        admins:admin_id(first_name, last_name)
      `, { count: "estimated" })
      .eq("site_id", siteId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    queryWithAdmin = applyFilters(queryWithAdmin);

    ({ data, error, count } = await queryWithAdmin);

    // エラーの詳細をログに記録
    if (error) {
      console.error("[Points History] Query error:", {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        studentId,
        siteId,
      });
    }

    if (error && (
      error.message?.includes("admin_id") ||
      error.message?.includes("schema cache") ||
      error.message?.includes("relationship") ||
      error.message?.includes("foreign key") ||
      error.code === "PGRST204" ||
      error.code === "PGRST200"
    )) {
      const query = applyFilters(
        supabase
          .from("point_transactions")
          .select(`
            id,
            transaction_type,
            points,
            description,
            reference_id,
            created_at
          `, { count: "estimated" })
          .eq("site_id", siteId)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1)
      );

      ({ data, error, count } = await query);
    }

    if (error) {
      const errorMessage = error.message || String(error);
      console.error("[Points History] Final error:", errorMessage);
      return NextResponse.json({ 
        ok: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          code: error.code,
          details: error.details,
          hint: error.hint,
        } : undefined
      }, { status: 500 });
    }

    // データが取得できた場合のログ
    if (process.env.NODE_ENV === 'development') {
      console.log("[Points History] Success:", {
        count: data?.length || 0,
        total: count || 0,
        studentId,
        hasMore: count !== null && count !== undefined ? (offset + limit < count) : false,
      });
    }

    const transactions = (data || []).map((transaction: any) => ({
      id: String(transaction.id),
      transactionType: transaction.transaction_type,
      points: transaction.points,
      description: transaction.description || null,
      referenceId: transaction.reference_id ? String(transaction.reference_id) : null,
      createdAt: transaction.created_at,
      adminId: transaction.admin_id ? String(transaction.admin_id) : null,
      adminName: transaction.admins
        ? `${transaction.admins.first_name || ""} ${transaction.admins.last_name || ""}`.trim() || null
        : null,
    }));

    return NextResponse.json({ 
      ok: true, 
      transactions,
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: count !== null && count !== undefined ? (offset + limit < count) : false
      }
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
