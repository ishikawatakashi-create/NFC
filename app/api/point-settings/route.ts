import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth-helpers";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function getSupabase() {
  // サービスロールキーを使用してRLSをバイパス
  return getSupabaseAdmin();
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

    const { admin, response } = await requireAdminApi();
    if (!admin) {
      return response;
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("point_settings")
      .select("entry_points, daily_limit, entry_notification_template, exit_notification_template")
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
      entry_notification_template: "[生徒名]さんが入室しました。\n時刻: [現在時刻]",
      exit_notification_template: "[生徒名]さんが退室しました。\n時刻: [現在時刻]",
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
    const { entryPoints, dailyLimit, entryTemplate, exitTemplate } = body as {
      entryPoints: number;
      dailyLimit: boolean;
      entryTemplate?: string;
      exitTemplate?: string;
    };

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

    if (entryPoints === undefined || entryPoints < 0) {
      return NextResponse.json(
        { ok: false, error: "entryPoints は0以上の数値である必要があります" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // UPSERT用のデータを構築
    const updateData: any = {
      site_id: siteId,
      entry_points: entryPoints,
      daily_limit: dailyLimit,
      updated_at: new Date().toISOString(),
    };

    // 通知テンプレートが指定されている場合は追加
    if (entryTemplate !== undefined) {
      updateData.entry_notification_template = entryTemplate;
    }
    if (exitTemplate !== undefined) {
      updateData.exit_notification_template = exitTemplate;
    }

    // UPSERT（存在する場合は更新、存在しない場合は挿入）
    const { error } = await supabase
      .from("point_settings")
      .upsert(updateData, {
        onConflict: "site_id",
      });

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



