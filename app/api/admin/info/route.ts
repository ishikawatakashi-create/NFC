import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

/**
 * GET /api/admin/info
 * 現在の管理者情報を取得
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

    // 管理者情報を取得
    const siteId = process.env.SITE_ID;
    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が設定されていません" },
        { status: 500 }
      );
    }

    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("first_name, last_name")
      .eq("auth_user_id", user.id)
      .eq("site_id", siteId)
      .single();

    if (adminError || !admin) {
      return NextResponse.json(
        { ok: false, error: "管理者情報が見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      admin: {
        firstName: admin.first_name,
        lastName: admin.last_name,
      },
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}





