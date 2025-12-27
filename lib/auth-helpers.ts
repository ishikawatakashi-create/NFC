import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

/**
 * 管理者情報の型定義
 */
export interface AdminInfo {
  id: string;
  authUserId: string;
  siteId: string;
  firstName: string;
  lastName: string;
  employmentType: "part_time" | "full_time";
  email: string;
}

/**
 * サーバー側で現在のセッションと管理者情報を取得
 * 未認証の場合はnullを返す
 */
export async function getCurrentAdmin(): Promise<AdminInfo | null> {
  try {
    const supabase = await createServerSupabaseClient();

    // セッション確認
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    // 管理者情報を取得
    const siteId = process.env.SITE_ID;
    if (!siteId) {
      return null;
    }

    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("id, auth_user_id, site_id, first_name, last_name, employment_type")
      .eq("auth_user_id", user.id)
      .eq("site_id", siteId)
      .single();

    if (adminError || !admin) {
      return null;
    }

    return {
      id: admin.id,
      authUserId: admin.auth_user_id,
      siteId: admin.site_id,
      firstName: admin.first_name,
      lastName: admin.last_name,
      employmentType: admin.employment_type as "part_time" | "full_time",
      email: user.email || "",
    };
  } catch (error) {
    console.error("Error getting current admin:", error);
    return null;
  }
}

/**
 * 認証が必要なページで使用
 * 未認証の場合はログインページにリダイレクト
 */
export async function requireAuth(): Promise<AdminInfo> {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  return admin;
}

