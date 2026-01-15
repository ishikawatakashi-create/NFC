import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// 管理ユーザー一覧取得
export async function GET(req: Request) {
  try {
    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }

    // サービスロールキーを使用してRLSをバイパス
    const supabase = getSupabaseAdmin();

    // 管理ユーザー一覧を取得
    const { data, error } = await supabase
      .from("admins")
      .select(
        `
        id,
        auth_user_id,
        site_id,
        first_name,
        last_name,
        employment_type,
        created_at,
        updated_at
        `
      )
      .eq("site_id", siteId)
      .order("created_at", { ascending: false });

    if (error) {
      const errorMessage = error.message || String(error);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    // メールアドレスを取得するためにauth.usersを参照
    const adminsWithEmail = await Promise.all(
      (data || []).map(async (admin: any) => {
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(admin.auth_user_id);
          return {
            id: admin.id,
            authUserId: admin.auth_user_id,
            email: authUser?.user?.email || "",
            firstName: admin.first_name,
            lastName: admin.last_name,
            employmentType: admin.employment_type,
            createdAt: admin.created_at,
            updatedAt: admin.updated_at,
          };
        } catch (e) {
          console.error(`Failed to get email for admin ${admin.id}:`, e);
          return {
            id: admin.id,
            authUserId: admin.auth_user_id,
            email: "",
            firstName: admin.first_name,
            lastName: admin.last_name,
            employmentType: admin.employment_type,
            createdAt: admin.created_at,
            updatedAt: admin.updated_at,
          };
        }
      })
    );

    return NextResponse.json({ ok: true, admins: adminsWithEmail });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
