import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getStudentBonusThreshold,
  hasReceivedPointsToday,
  getMonthlyEntryCount,
  hasReceivedBonusThisMonth,
  addPoints,
} from "@/lib/point-utils";

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
      .select("id, name, last_event_type, role, class, bonus_threshold, has_custom_bonus_threshold")
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

    // 入室時かつ生徒ユーザーの場合、ポイントを付与
    const pointsAwarded: { entry?: number; bonus?: number } = {};
    if (eventType === "entry" && studentData.role === "student") {
      try {
        // 1. 入室ポイント（1日1回のみ）
        const hasReceivedToday = await hasReceivedPointsToday(siteId, studentId);
        console.log(`[Points] Student ${studentId}: hasReceivedToday=${hasReceivedToday}`);
        
        if (!hasReceivedToday) {
          const entryPointsAdded = await addPoints(
            siteId,
            studentId,
            1,
            "entry",
            "入室によるポイント付与",
            logData.id
          );
          console.log(`[Points] Student ${studentId}: entryPointsAdded=${entryPointsAdded}`);
          if (entryPointsAdded) {
            pointsAwarded.entry = 1;
          } else {
            console.error(`[Points] Failed to add entry points for student ${studentId}`);
          }
        } else {
          console.log(`[Points] Student ${studentId}: Already received points today, skipping entry points`);
        }

        // 2. ボーナスポイント（同月内でX回入室で3点、1ヶ月に1回のみ）
        const monthlyEntryCount = await getMonthlyEntryCount(siteId, studentId);
        const bonusThreshold = await getStudentBonusThreshold(
          siteId,
          studentData.role as "student" | "part_time" | "full_time",
          studentData.class || null,
          studentData.has_custom_bonus_threshold || false,
          studentData.bonus_threshold
        );

        console.log(`[Points] Student ${studentId}: monthlyEntryCount=${monthlyEntryCount}, bonusThreshold=${bonusThreshold}`);

        if (monthlyEntryCount >= bonusThreshold) {
          const hasReceivedBonus = await hasReceivedBonusThisMonth(siteId, studentId);
          console.log(`[Points] Student ${studentId}: hasReceivedBonus=${hasReceivedBonus}`);
          
          if (!hasReceivedBonus) {
            const bonusPointsAdded = await addPoints(
              siteId,
              studentId,
              3,
              "bonus",
              `同月内${bonusThreshold}回入室達成によるボーナス`,
              logData.id
            );
            console.log(`[Points] Student ${studentId}: bonusPointsAdded=${bonusPointsAdded}`);
            if (bonusPointsAdded) {
              pointsAwarded.bonus = 3;
            } else {
              console.error(`[Points] Failed to add bonus points for student ${studentId}`);
            }
          } else {
            console.log(`[Points] Student ${studentId}: Already received bonus this month, skipping bonus points`);
          }
        } else {
          console.log(`[Points] Student ${studentId}: Entry count (${monthlyEntryCount}) < threshold (${bonusThreshold}), no bonus`);
        }
      } catch (pointsError: any) {
        // ポイント付与のエラーはログに記録するが、入室ログ自体は成功として扱う
        console.error(`[Points] Error awarding points for student ${studentId}:`, pointsError);
      }
    } else {
      if (eventType !== "entry") {
        console.log(`[Points] Event type is ${eventType}, not entry. Skipping points.`);
      } else if (studentData.role !== "student") {
        console.log(`[Points] Student role is ${studentData.role}, not student. Skipping points.`);
      }
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
      pointsAwarded: Object.keys(pointsAwarded).length > 0 ? pointsAwarded : undefined,
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

