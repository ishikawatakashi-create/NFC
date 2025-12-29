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
      .select("class, bonus_threshold, bonus_points")
      .eq("site_id", siteId);

    if (error) {
      const errorMessage = error.message || String(error);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    const classThresholds: Record<string, number> = {};
    const classBonusPoints: Record<string, number> = {};

    (data || []).forEach((item: any) => {
      classThresholds[item.class] = item.bonus_threshold;
      classBonusPoints[item.class] = item.bonus_points || 3; // デフォルト値
    });

    return NextResponse.json({ ok: true, thresholds: classThresholds, bonusPoints: classBonusPoints });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

// クラス別ボーナス閾値設定を更新
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { class: studentClass, bonusThreshold, bonusPoints } = body as {
      class: "kindergarten" | "beginner" | "challenger" | "creator" | "innovator";
      bonusThreshold: number;
      bonusPoints?: number;
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

    if (bonusPoints !== undefined && bonusPoints <= 0) {
      return NextResponse.json(
        { ok: false, error: "bonusPoints は1以上の数値である必要があります" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // UPSERT（存在する場合は更新、存在しない場合は挿入）
    const updateData: any = {
      site_id: siteId,
      class: studentClass,
      bonus_threshold: bonusThreshold,
      updated_at: new Date().toISOString(),
    };

    // bonusPointsが指定されている場合は含める
    if (bonusPoints !== undefined) {
      updateData.bonus_points = bonusPoints;
    }

    const { error } = await supabase
      .from("class_based_bonus_thresholds")
      .upsert(updateData, {
        onConflict: "site_id,class",
      });

    if (error) {
      const errorMessage = error.message || String(error);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: `${studentClass}のボーナス設定を保存しました`,
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

