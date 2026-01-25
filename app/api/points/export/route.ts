import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminApi } from "@/lib/auth-helpers";

function getSupabase() {
  return getSupabaseAdmin();
}

// ポイント履歴のエクスポート（CSV形式）
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
      return query;
    };

    let data: any[] | null = null;
    let error: any = null;

    const queryWithAdmin = applyFilters(
      supabase
        .from("point_transactions")
        .select(`
          id,
          transaction_type,
          points,
          description,
          created_at,
          admin_id,
          students!inner(id, name),
          admins:admin_id(first_name, last_name)
        `)
        .eq("site_id", siteId)
        .order("created_at", { ascending: false })
        .limit(50000)
    );

    ({ data, error } = await queryWithAdmin);

    if (error && (
      error.message?.includes("admin_id") ||
      error.message?.includes("schema cache") ||
      error.message?.includes("relationship") ||
      error.message?.includes("foreign key") ||
      error.code === "PGRST204" ||
      error.code === "PGRST200"
    )) {
      const queryWithAdminId = applyFilters(
        supabase
          .from("point_transactions")
          .select(`
            id,
            transaction_type,
            points,
            description,
            created_at,
            admin_id,
            students!inner(id, name)
          `)
          .eq("site_id", siteId)
          .order("created_at", { ascending: false })
          .limit(50000)
      );

      ({ data, error } = await queryWithAdminId);
    }

    if (error && (
      error.message?.includes("admin_id") ||
      error.code === "PGRST204" ||
      error.code === "PGRST200"
    )) {
      const queryBasic = applyFilters(
        supabase
          .from("point_transactions")
          .select(`
            id,
            transaction_type,
            points,
            description,
            created_at,
            students!inner(id, name)
          `)
          .eq("site_id", siteId)
          .order("created_at", { ascending: false })
          .limit(50000)
      );

      ({ data, error } = await queryBasic);
    }

    if (error) {
      return NextResponse.json(
        { ok: false, error: "ポイント履歴の取得に失敗しました" },
        { status: 500 }
      );
    }

    // トランザクション種別の日本語ラベル
    const getTransactionTypeLabel = (type: string) => {
      switch (type) {
        case "entry":
          return "入室";
        case "bonus":
          return "ボーナス";
        case "consumption":
          return "消費";
        case "admin_add":
          return "管理追加";
        case "admin_subtract":
          return "管理減算";
        default:
          return type;
      }
    };

    // CSV形式に変換
    const csvHeader = "日時,生徒名,種別,ポイント,説明,操作者\n";
    
    // CSV形式: 値にカンマや改行が含まれる場合はダブルクォートで囲む
    const escapeCsv = (value: string) => {
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };
    
    const adminIds = Array.from(
      new Set((data || []).map((transaction: any) => transaction.admin_id).filter(Boolean))
    );
    const adminMap = new Map<string, string>();
    if (adminIds.length > 0) {
      const { data: adminsData } = await supabase
        .from("admins")
        .select("id, first_name, last_name")
        .in("id", adminIds);

      (adminsData || []).forEach((admin: any) => {
        const name = `${admin.first_name || ""} ${admin.last_name || ""}`.trim();
        if (admin.id) {
          adminMap.set(String(admin.id), name);
        }
      });
    }

    const csvRows = (data || []).map((transaction: any) => {
      const date = new Date(transaction.created_at).toLocaleString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const studentName = transaction.students?.name || "不明";
      const type = getTransactionTypeLabel(transaction.transaction_type);
      const points = transaction.points;
      const description = transaction.description || "";
      const adminNameFromJoin = transaction.admins
        ? `${transaction.admins.first_name || ""} ${transaction.admins.last_name || ""}`.trim()
        : "";
      const adminName = adminNameFromJoin || (transaction.admin_id ? adminMap.get(String(transaction.admin_id)) || "" : "");

      return [
        escapeCsv(date),
        escapeCsv(studentName),
        escapeCsv(type),
        points,
        escapeCsv(description),
        escapeCsv(adminName),
      ].join(",");
    }).join("\n");

    const csv = "\uFEFF" + csvHeader + csvRows;

    // CSVファイルとして返す
    const dateStamp = new Date().toISOString().split("T")[0];
    const asciiFileName = `points_history_${dateStamp}.csv`;
    const utf8FileName = `ポイント履歴_${dateStamp}.csv`;
    const encodedFileName = encodeURIComponent(utf8FileName);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`,
      },
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
