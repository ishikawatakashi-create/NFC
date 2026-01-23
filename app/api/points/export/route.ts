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

    // admin_idカラムが存在しない場合でも動作するように、まず基本カラムのみで取得
    let query = supabase
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
      .limit(50000); // エクスポート上限

    // studentIdが指定されている場合はフィルタ
    if (studentId) {
      query = query.eq("student_id", studentId);
    }

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

    let { data, error } = await query;

    // admin_idカラムが存在する場合は、再度取得を試みる
    if (!error && data) {
      try {
        const queryWithAdmin = supabase
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
          .limit(50000);
        
        if (studentId) {
          queryWithAdmin.eq("student_id", studentId);
        }
        if (startDate) {
          queryWithAdmin.gte("created_at", startDate);
        }
        if (endDate) {
          queryWithAdmin.lte("created_at", endDate);
        }
        if (transactionType && transactionType !== "all") {
          queryWithAdmin.eq("transaction_type", transactionType);
        }

        const result = await queryWithAdmin;
        if (!result.error) {
          data = result.data;
        }
      } catch (e) {
        // admin_idカラムが存在しない場合は、基本データのみを使用
        console.warn("[Points Export] admin_id column not available, using basic data");
      }
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
      const adminName = transaction.admins
        ? `${transaction.admins.first_name || ""} ${transaction.admins.last_name || ""}`.trim()
        : "";

      return [
        escapeCsv(date),
        escapeCsv(studentName),
        escapeCsv(type),
        points,
        escapeCsv(description),
        escapeCsv(adminName),
      ].join(",");
    }).join("\n");

    const csv = csvHeader + csvRows;

    // CSVファイルとして返す
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="ポイント履歴_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
