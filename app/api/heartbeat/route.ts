import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const responseHeaders = {
    "Cache-Control": "no-store, max-age=0",
  };
  const cronAuth = requireCronSecret(req);
  if (!cronAuth.ok) {
    return cronAuth.response;
  }

  try {
    const supabase = getSupabaseAdmin();
    const checkedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from("students")
      .select("id")
      .limit(1);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message || "Heartbeat query failed" },
        { status: 500, headers: responseHeaders }
      );
    }

    return NextResponse.json({
      ok: true,
      source: "supabase-heartbeat",
      checkedAt,
      touchedTable: "students",
      rowsSeen: data?.length ?? 0,
    }, { headers: responseHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500, headers: responseHeaders }
    );
  }
}
