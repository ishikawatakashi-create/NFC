import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// 入退室ログ更新（訂正用）
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { eventType, timestamp, memo } = body as {
      eventType?: "entry" | "exit" | "no_log";
      timestamp?: string;
      memo?: string;
    };

    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }

    if (!id) {
      return NextResponse.json({ ok: false, error: "id は必須です" }, { status: 400 });
    }

    const supabase = getSupabase();

    const updateData: any = {};
    if (eventType !== undefined) {
      updateData.event_type = eventType;
    }
    if (timestamp !== undefined) {
      updateData.timestamp = timestamp;
    }
    if (memo !== undefined) {
      // memoは別テーブルに保存する想定（今回は簡易実装）
      updateData.updated_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("access_logs")
      .update(updateData)
      .eq("id", id)
      .eq("site_id", siteId)
      .select()
      .single();

    if (error) {
      const errorMessage = error.message || String(error);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: "ログが見つかりません" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      log: {
        id: String(data.id),
        timestamp: data.timestamp,
        eventType: data.event_type,
        cardId: data.card_id,
        device: data.device_id || data.card_id,
        notification: data.notification_status,
      },
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}




