import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// 属性ごとの開放時間設定を取得
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
      .from("role_based_access_times")
      .select("role, start_time, end_time")
      .eq("site_id", siteId);

    if (error) {
      const errorMessage = error.message || String(error);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    // デフォルト値を設定（データが存在しない場合）
    const defaultTimes = {
      student: { start_time: "09:00", end_time: "20:00" },
      part_time: { start_time: "09:00", end_time: "20:00" },
      full_time: { start_time: "09:00", end_time: "20:00" },
    };

    const roleTimes: Record<string, { start_time: string; end_time: string }> = {};

    (data || []).forEach((item: any) => {
      roleTimes[item.role] = {
        start_time: item.start_time,
        end_time: item.end_time,
      };
    });

    // デフォルト値をマージ
    const result = {
      student: roleTimes.student || defaultTimes.student,
      part_time: roleTimes.part_time || defaultTimes.part_time,
      full_time: roleTimes.full_time || defaultTimes.full_time,
    };

    return NextResponse.json({ ok: true, accessTimes: result });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

// 属性ごとの開放時間設定を更新
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { role, startTime, endTime } = body as {
      role: "student" | "part_time" | "full_time";
      startTime: string;
      endTime: string;
    };

    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }

    if (!role || !startTime || !endTime) {
      return NextResponse.json(
        { ok: false, error: "role, startTime, endTime は必須です" },
        { status: 400 }
      );
    }

    if (!["student", "part_time", "full_time"].includes(role)) {
      return NextResponse.json(
        { ok: false, error: "role は student, part_time, full_time のいずれかである必要があります" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // upsert（存在すれば更新、存在しなければ作成）
    const { data, error } = await supabase
      .from("role_based_access_times")
      .upsert(
        {
          site_id: siteId,
          role,
          start_time: startTime,
          end_time: endTime,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "site_id,role",
        }
      )
      .select()
      .single();

    if (error) {
      const errorMessage = error.message || String(error);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      accessTime: {
        role: data.role,
        start_time: data.start_time,
        end_time: data.end_time,
      },
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

