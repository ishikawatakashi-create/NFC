import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * LINE公式アカウントの友だち一覧を取得
 * データベースのline_followersテーブルから取得
 */
export async function GET(req: Request) {
  try {
    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が設定されていません" },
        { status: 500 }
      );
    }

    const supabase = getSupabaseAdmin();

    // line_followersテーブルからアクティブな友だち一覧を取得
    const { data, error } = await supabase
      .from("line_followers")
      .select("line_user_id, line_display_name, picture_url, followed_at")
      .eq("site_id", siteId)
      .eq("is_active", true)
      .order("followed_at", { ascending: false });

    if (error) {
      const errorMessage = error.message || String(error);
      console.error(`[LineFollowers] Failed to get followers:`, errorMessage);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    const followers = (data || []).map((follower) => ({
      userId: follower.line_user_id,
      displayName: follower.line_display_name || follower.line_user_id,
      pictureUrl: follower.picture_url,
    }));

    return NextResponse.json({
      ok: true,
      followers,
      count: followers.length,
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    console.error(`[LineFollowers] Error:`, errorMessage);
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

