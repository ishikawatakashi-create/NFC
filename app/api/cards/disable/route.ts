import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/cards/disable
 * カードトークンを無効化する
 * 
 * リクエスト: { token?: string, cardTokenId?: string }
 * レスポンス: { ok: true }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, cardTokenId } = body as { token?: string; cardTokenId?: string };

    // バリデーション
    if (!token && !cardTokenId) {
      return NextResponse.json(
        { ok: false, error: "token または cardTokenId のいずれかが必要です" },
        { status: 400 }
      );
    }

    const siteId = process.env.SITE_ID;
    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が設定されていません" },
        { status: 500 }
      );
    }

    const supabase = getSupabaseAdmin();

    // クエリを組み立て
    let query = supabase
      .from("card_tokens")
      .update({ is_active: false, disabled_at: new Date().toISOString() })
      .eq("site_id", siteId);

    if (cardTokenId) {
      query = query.eq("id", cardTokenId);
    } else if (token) {
      query = query.eq("token", token);
    }

    const { error } = await query;

    if (error) {
      return NextResponse.json(
        { ok: false, error: `無効化に失敗しました: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}


