import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// クラス別ボーナス閾値設定を取得
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
      .from("class_based_bonus_thresholds")
      .select("class, bonus_threshold")
      .eq("site_id", siteId);

    if (error) {
      const errorMessage = error.message || String(error);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    const classThresholds: Record<string, number> = {};

    (data || []).forEach((item: any) => {
      classThresholds[item.class] = item.bonus_threshold;
    });

    return NextResponse.json({ ok: true, thresholds: classThresholds });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

// クラス別ボーナス閾値設定を更新
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { class: studentClass, bonusThreshold } = body as {
      class: "kindergarten" | "beginner" | "challenger" | "creator" | "innovator";
      bonusThreshold: number;
    };

    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }

    if (!studentClass) {
      return NextResponse.json({ ok: false, error: "class は必須です" }, { status: 400 });
    }

    if (!bonusThreshold || bonusThreshold <= 0) {
      return NextResponse.json(
        { ok: false, error: "bonusThreshold は1以上の数値である必要があります" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // UPSERT（存在する場合は更新、存在しない場合は挿入）
    const { error } = await supabase
      .from("class_based_bonus_thresholds")
      .upsert(
        {
          site_id: siteId,
          class: studentClass,
          bonus_threshold: bonusThreshold,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "site_id,class",
        }
      );

    if (error) {
      const errorMessage = error.message || String(error);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: `${studentClass}のボーナス閾値を${bonusThreshold}回に設定しました`,
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

