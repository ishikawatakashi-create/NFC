import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ポイント設定を取得
export async function GET(req: Request) {
  try {
    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("point_settings")
      .select("entry_points, daily_limit")
      .eq("site_id", siteId)
      .single();

    if (error && error.code !== "PGRST116") {
      const errorMessage = error.message || String(error);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    // デフォルト値
    const settings = data || {
      entry_points: 1,
      daily_limit: true,
    };

    return NextResponse.json({ ok: true, settings });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

// ポイント設定を更新
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { entryPoints, dailyLimit } = body as {
      entryPoints: number;
      dailyLimit: boolean;
    };

    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }

    if (entryPoints === undefined || entryPoints < 0) {
      return NextResponse.json(
        { ok: false, error: "entryPoints は0以上の数値である必要があります" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // UPSERT（存在する場合は更新、存在しない場合は挿入）
    const { error } = await supabase
      .from("point_settings")
      .upsert(
        {
          site_id: siteId,
          entry_points: entryPoints,
          daily_limit: dailyLimit,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "site_id",
        }
      );

    if (error) {
      const errorMessage = error.message || String(error);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "ポイント設定を保存しました",
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}


