import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

/**
 * GET /api/admin/check
 * 現在のセッションが管理者かどうかを確認
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // セッション確認
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "認証されていません" },
        { status: 401 }
      );
    }

    // 管理者情報を確認
    const siteId = process.env.SITE_ID;
    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が設定されていません" },
        { status: 500 }
      );
    }

    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("id")
      .eq("auth_user_id", user.id)
      .eq("site_id", siteId)
      .maybeSingle();

    if (adminError) {
      console.error("[AdminCheck] Error checking admin:", adminError);
      return NextResponse.json(
        { ok: false, error: `管理者情報の確認に失敗しました: ${adminError.message}` },
        { status: 500 }
      );
    }

    if (!admin) {
      console.log("[AdminCheck] Admin not found for user:", user.id);
      return NextResponse.json(
        { ok: false, error: "管理者として登録されていません" },
        { status: 403 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}







