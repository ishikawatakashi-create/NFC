import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminApi } from "@/lib/auth-helpers";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// 属性別ボーナス閾値設定を取得
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
      .from("role_based_bonus_thresholds")
      .select("role, bonus_threshold")
      .eq("site_id", siteId);

    if (error) {
      const errorMessage = error.message || String(error);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    // デフォルト値を設定（データが存在しない場合）
    const defaultThresholds = {
      student: 10,
      part_time: 10,
      full_time: 10,
    };

    const roleThresholds: Record<string, number> = {};

    (data || []).forEach((item: any) => {
      roleThresholds[item.role] = item.bonus_threshold;
    });

    // デフォルト値をマージ
    const result = {
      student: roleThresholds.student || defaultThresholds.student,
      part_time: roleThresholds.part_time || defaultThresholds.part_time,
      full_time: roleThresholds.full_time || defaultThresholds.full_time,
    };

    return NextResponse.json({ ok: true, thresholds: result });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

// 属性別ボーナス閾値設定を更新
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { role, bonusThreshold } = body as {
      role: "student" | "part_time" | "full_time";
      bonusThreshold: number;
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

    if (!role) {
      return NextResponse.json({ ok: false, error: "role は必須です" }, { status: 400 });
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
      .from("role_based_bonus_thresholds")
      .upsert(
        {
          site_id: siteId,
          role: role,
          bonus_threshold: bonusThreshold,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "site_id,role",
        }
      );

    if (error) {
      const errorMessage = error.message || String(error);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: `${role}のボーナス閾値を${bonusThreshold}回に設定しました`,
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}






