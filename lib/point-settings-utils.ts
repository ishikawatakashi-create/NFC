import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function getSupabase() {
  // サービスロールキーを使用してRLSをバイパス
  // ポイント設定の取得は常にサーバーサイドで行われるため安全
  return getSupabaseAdmin();
}

/**
 * ポイント設定を取得する
 * @param siteId サイトID
 * @returns ポイント設定（entry_points, daily_limit）
 */
export async function getPointSettings(siteId: string): Promise<{
  entry_points: number;
  daily_limit: boolean;
}> {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("point_settings")
      .select("entry_points, daily_limit")
      .eq("site_id", siteId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Failed to get point settings:", error);
      // エラーの場合はデフォルト値を返す
      return {
        entry_points: 1,
        daily_limit: true,
      };
    }

    // データが存在しない場合はデフォルト値
    if (!data) {
      return {
        entry_points: 1,
        daily_limit: true,
      };
    }

    return {
      entry_points: data.entry_points ?? 1,
      daily_limit: data.daily_limit ?? true,
    };
  } catch (e: any) {
    console.error("Error in getPointSettings:", e);
    // エラーの場合はデフォルト値を返す
    return {
      entry_points: 1,
      daily_limit: true,
    };
  }
}






