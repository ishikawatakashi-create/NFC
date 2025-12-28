import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// 入退室ログ一覧取得
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const logType = searchParams.get("type");
    const searchQuery = searchParams.get("search");
    const studentId = searchParams.get("studentId");

    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }

    const supabase = getSupabase();

    // access_logsテーブルとstudentsテーブルをJOINして取得
    let query = supabase
      .from("access_logs")
      .select(`
        id,
        event_type,
        card_id,
        device_id,
        timestamp,
        notification_status,
        students!inner(id, name, site_id)
      `)
      .eq("site_id", siteId)
      .order("timestamp", { ascending: false })
      .limit(1000);

    // ユーザーIDでフィルタ（優先）
    if (studentId) {
      query = query.eq("student_id", studentId);
    }

    // 日付範囲フィルタ
    if (startDate) {
      query = query.gte("timestamp", startDate);
    }
    if (endDate) {
      query = query.lte("timestamp", endDate);
    }

    // 種別フィルタ
    if (logType && logType !== "all") {
      query = query.eq("event_type", logType);
    }

    const { data, error } = await query;

    if (error) {
      const errorMessage = error.message || String(error);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    // 生徒名でフィルタ（クライアント側でフィルタリング）
    let logs = (data || []).map((log: any) => ({
      id: String(log.id),
      timestamp: log.timestamp,
      studentName: log.students?.name || "不明",
      studentId: String(log.students?.id || ""),
      type: log.event_type,
      cardId: log.card_id || null,
      device: log.device_id || log.card_id || "不明",
      notification: log.notification_status,
    }));

    // 生徒名で検索（studentIdが指定されていない場合のみ）
    if (searchQuery && !studentId) {
      logs = logs.filter((log) =>
        log.studentName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return NextResponse.json({ ok: true, logs });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

// 入退室ログ作成
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentId, cardId, deviceId, eventType, notificationStatus } = body as {
      studentId: string;
      cardId?: string;
      deviceId?: string;
      eventType: "entry" | "exit" | "no_log";
      notificationStatus?: "sent" | "not_required";
    };

    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }

    if (!studentId) {
      return NextResponse.json({ ok: false, error: "studentId は必須です" }, { status: 400 });
    }

    if (!eventType) {
      return NextResponse.json({ ok: false, error: "eventType は必須です" }, { status: 400 });
    }

    const supabase = getSupabase();

    // 生徒の現在の状態を確認
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("id, name, last_event_type")
      .eq("id", studentId)
      .eq("site_id", siteId)
      .single();

    if (studentError) {
      const errorMessage = studentError.message || String(studentError);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    if (!studentData) {
      return NextResponse.json({ ok: false, error: "生徒が見つかりません" }, { status: 404 });
    }

    // 不正な操作をチェック（ログに残さずエラーを返す）
    const currentEventType = studentData.last_event_type;
    
    // 退室状態で退室操作があった場合
    if (currentEventType === "exit" && eventType === "exit") {
      return NextResponse.json(
        { 
          ok: false, 
          error: `${studentData.name || "この生徒"}さんは既に退室済みです。` 
        },
        { status: 400 }
      );
    }

    // 入室状態で入室操作があった場合
    if (currentEventType === "entry" && eventType === "entry") {
      return NextResponse.json(
        { 
          ok: false, 
          error: `${studentData.name || "この生徒"}さんは既に入室済みです。` 
        },
        { status: 400 }
      );
    }

    // ログを作成
    const { data: logData, error: logError } = await supabase
      .from("access_logs")
      .insert([
        {
          site_id: siteId,
          student_id: studentId, // UUIDは文字列として扱う
          event_type: eventType,
          card_id: cardId || null,
          device_id: deviceId || cardId || null,
          notification_status: notificationStatus || "not_required",
        },
      ])
      .select()
      .single();

    if (logError) {
      const errorMessage = logError.message || String(logError);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    // 生徒の最終イベント情報を更新
    const { error: updateError } = await supabase
      .from("students")
      .update({
        last_event_type: eventType,
        last_event_timestamp: new Date().toISOString(),
      })
      .eq("id", studentId) // UUIDは文字列として扱う
      .eq("site_id", siteId);

    if (updateError) {
      // ログは作成できたが、更新に失敗した場合は警告のみ
      console.warn("Failed to update student last event:", updateError);
    }

    return NextResponse.json({
      ok: true,
      log: {
        id: String(logData.id),
        timestamp: logData.timestamp,
        eventType: logData.event_type,
        cardId: logData.card_id,
        device: logData.device_id || logData.card_id,
        notification: logData.notification_status,
      },
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

