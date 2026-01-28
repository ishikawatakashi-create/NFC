import { NextResponse } from "next/server";
import {
  getStudentBonusThreshold,
  getStudentBonusPoints,
  getClassBonusEnabled,
  hasReceivedPointsToday,
  getMonthlyEntryCount,
  hasReceivedBonusThisMonth,
  addPoints,
} from "@/lib/point-utils";
import { getPointSettings } from "@/lib/point-settings-utils";
import { sendLineNotificationToParents } from "@/lib/line-notification-utils";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getStudentAccessTime, hasAccessWindowBetween } from "@/lib/access-time-utils";
import { requireAdminApi } from "@/lib/auth-helpers";
import { AUTO_EXIT_CONSTANTS } from "@/lib/constants";

function requireKioskSecret(req: Request): { ok: true } | { ok: false; response: NextResponse } {
  const secret = process.env.KIOSK_API_SECRET;
  
  // 開発環境では、KIOSK_API_SECRETが設定されていない場合は認証をスキップ
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (!secret && isDevelopment) {
    console.warn('[KioskAuth] KIOSK_API_SECRET が設定されていません。開発環境のため認証をスキップします。');
    return { ok: true };
  }
  
  // 本番環境では、KIOSK_API_SECRETが必須
  if (!secret) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "KIOSK_API_SECRET が設定されていません" },
        { status: 500 }
      ),
    };
  }

  const provided = req.headers.get("x-kiosk-secret");
  
  if (!provided || provided !== secret) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "認証に失敗しました" },
        { status: 401 }
      ),
    };
  }

  return { ok: true };
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

    const { admin, response } = await requireAdminApi();
    if (!admin) {
      return response;
    }

    const supabase = getSupabaseAdmin();

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
        points_awarded,
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
      pointsAwarded: log.points_awarded || false,
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
    const kioskAuth = requireKioskSecret(req);
    if (!kioskAuth.ok) {
      return kioskAuth.response;
    }

    console.log(`[AccessLogs] POST request received`);
    const body = await req.json();
    const { studentId, cardId, deviceId, eventType, notificationStatus } = body as {
      studentId: string;
      cardId?: string;
      deviceId?: string;
      eventType: "entry" | "exit" | "no_log" | "forced_exit";
      notificationStatus?: "sent" | "not_required";
    };

    console.log(`[AccessLogs] Request data: studentId=${studentId}, eventType=${eventType}`);

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

    const supabase = getSupabaseAdmin();

    // 生徒の現在の状態を確認
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("id, name, last_event_type, role, class, bonus_threshold, has_custom_bonus_threshold")
      .eq("id", studentId)
      .eq("site_id", siteId)
      .maybeSingle();

    if (studentError) {
      const errorMessage = studentError.message || String(studentError);
      console.error(`[AccessLogs] Failed to fetch student ${studentId}:`, errorMessage);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    if (!studentData) {
      console.error(`[AccessLogs] Student not found: ${studentId}`);
      return NextResponse.json({ ok: false, error: "生徒が見つかりません" }, { status: 404 });
    }

    console.log(`[AccessLogs] Student found: ${studentData.name}, role=${studentData.role}, eventType=${eventType}`);

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
    console.log(`[AccessLogs] Creating log for student ${studentId}, eventType=${eventType}`);
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
      console.error(`[AccessLogs] Failed to create log:`, errorMessage);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    console.log(`[AccessLogs] Log created successfully: ${logData.id}`);

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
    console.log(`[AccessLogs] Checking points eligibility: eventType=${eventType}, role=${studentData.role}, studentId=${studentId}`);
    const pointsAwarded: { entry?: number; bonus?: number } = {};
    if (eventType === "entry" && studentData.role === "student") {
      console.log(`[AccessLogs] ✅ Student is eligible for points, starting point award process for ${studentData.name} (${studentId})`);
      try {
        // ポイント設定を取得
        const pointSettings = await getPointSettings(siteId);
        const entryPoints = pointSettings.entry_points;
        const dailyLimit = pointSettings.daily_limit;

        // 1. 入室ポイント（1日1回制限が有効な場合のみチェック）
        let shouldAwardEntryPoints = true;
        if (dailyLimit) {
          const hasReceivedToday = await hasReceivedPointsToday(siteId, studentId);
          console.log(`[Points] Student ${studentId}: hasReceivedToday=${hasReceivedToday}, dailyLimit=${dailyLimit}`);
          shouldAwardEntryPoints = !hasReceivedToday;
        }

        if (shouldAwardEntryPoints && entryPoints > 0) {
          const entryPointsAdded = await addPoints(
            siteId,
            studentId,
            entryPoints,
            "entry",
            "入室によるポイント付与",
            logData.id
          );
          console.log(`[Points] Student ${studentId}: entryPointsAdded=${entryPointsAdded}, points=${entryPoints}`);
          if (entryPointsAdded) {
            pointsAwarded.entry = entryPoints;
          } else {
            console.error(`[Points] Failed to add entry points for student ${studentId}`);
          }
        } else {
          if (dailyLimit) {
            console.log(`[Points] Student ${studentId}: Already received points today, skipping entry points`);
          } else if (entryPoints === 0) {
            console.log(`[Points] Student ${studentId}: Entry points is set to 0, skipping entry points`);
          }
        }

        // 2. ボーナスポイント（同月内でX回入室で3点、1ヶ月に1回のみ）
        const classBonusEnabled = await getClassBonusEnabled(siteId, studentData.class || null);
        if (classBonusEnabled) {
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
              // クラス別のボーナスポイント数を取得
              const bonusPoints = await getStudentBonusPoints(siteId, studentData.class);
              console.log(`[Points] Student ${studentId}: bonusPoints=${bonusPoints} (class: ${studentData.class})`);
              
              const bonusPointsAdded = await addPoints(
                siteId,
                studentId,
                bonusPoints,
                "bonus",
                `同月内${bonusThreshold}回入室達成によるボーナス`,
                logData.id
              );
              console.log(`[Points] Student ${studentId}: bonusPointsAdded=${bonusPointsAdded}`);
              if (bonusPointsAdded) {
                pointsAwarded.bonus = bonusPoints;
              } else {
                console.error(`[Points] Failed to add bonus points for student ${studentId}`);
              }
            } else {
              console.log(`[Points] Student ${studentId}: Already received bonus this month, skipping bonus points`);
            }
          } else {
            console.log(`[Points] Student ${studentId}: Entry count (${monthlyEntryCount}) < threshold (${bonusThreshold}), no bonus`);
          }
        } else {
          console.log(`[Points] Bonus points disabled for class, skipping bonus for student ${studentId}`);
        }

        // ポイントが付与された場合、ログのpoints_awardedをtrueに更新
        if (Object.keys(pointsAwarded).length > 0) {
          const { error: updatePointsError } = await supabase
            .from("access_logs")
            .update({ points_awarded: true })
            .eq("id", logData.id);

          if (updatePointsError) {
            console.warn(`[Points] Failed to update points_awarded flag for log ${logData.id}:`, updatePointsError);
          } else {
            console.log(`[Points] Updated points_awarded flag for log ${logData.id}`);
          }
        }
      } catch (pointsError: any) {
        // ポイント付与のエラーはログに記録するが、入室ログ自体は成功として扱う
        console.error(`[Points] Error awarding points for student ${studentId}:`, pointsError);
      }
    } else {
      if (eventType !== "entry") {
        console.log(`[Points] ❌ Event type is ${eventType}, not entry. Skipping points.`);
      } else if (studentData.role !== "student") {
        console.log(`[Points] ❌ Student role is "${studentData.role}", not "student". Skipping points. (Student: ${studentData.name}, ID: ${studentId})`);
      }
    }

    // 入退室時（entry/exit/forced_exit）かつ生徒ユーザーの場合、親御さんにLINE通知を送信
    if (
      (eventType === "entry" || eventType === "exit" || eventType === "forced_exit") &&
      studentData.role === "student"
    ) {
      console.log(
        `[LineNotification] Sending LINE notification for student ${studentData.name} (${studentId}), eventType=${eventType}`
      );
      try {
        const notificationResult = await sendLineNotificationToParents(
          siteId,
          studentId,
          eventType,
          String(logData.id),
          studentData.name
        );

        if (notificationResult.success && notificationResult.sentCount > 0) {
          console.log(
            `[LineNotification] Successfully sent ${notificationResult.sentCount} LINE notification(s) for student ${studentData.name}`
          );
          // 通知ステータスを更新
          await supabase
            .from("access_logs")
            .update({ notification_status: "sent" })
            .eq("id", logData.id);
        } else if (notificationResult.success && notificationResult.sentCount === 0) {
          console.log(
            `[LineNotification] No active LINE accounts found for student ${studentData.name}. Skipping notification status update.`
          );
        } else {
          console.error(
            `[LineNotification] Failed to send LINE notification for student ${studentData.name}: ${notificationResult.error}`
          );
        }
      } catch (notificationError: any) {
        // LINE通知のエラーはログに記録するが、入退室ログ自体は成功として扱う
        console.error(
          `[LineNotification] Error sending LINE notification for student ${studentId}:`,
          notificationError
        );
      }
    } else {
      if (studentData.role !== "student") {
        console.log(
          `[LineNotification] ❌ Student role is "${studentData.role}", not "student". Skipping LINE notification. (Student: ${studentData.name}, ID: ${studentId})`
        );
      } else if (
        eventType !== "entry" &&
        eventType !== "exit" &&
        eventType !== "forced_exit"
      ) {
        console.log(
          `[LineNotification] ❌ Event type is ${eventType}, not entry/exit/forced_exit. Skipping LINE notification.`
        );
      }
    }

    // 入退室処理が成功した後、非同期で自動退室チェックを実行
    // レスポンス時間への影響を最小限にするため、awaitしない
    // 5分に1回のみ実行（パフォーマンス最適化）
    if (shouldRunAutoExitCheck()) {
      checkAndProcessAutoExit(siteId).catch((error) => {
        console.error("[AutoExit] Error in background auto-exit check:", error);
      });
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
        pointsAwarded: logData.points_awarded || false,
      },
      pointsAwarded: Object.keys(pointsAwarded).length > 0 ? pointsAwarded : undefined,
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

// 自動退室チェックの最終実行時刻（メモリ内で管理）
let lastAutoExitCheckTime = 0;

/**
 * 自動退室チェックを実行すべきか判定
 * 最後のチェックから設定された間隔以上経過している場合のみtrue
 */
function shouldRunAutoExitCheck(): boolean {
  const now = Date.now();
  
  if (now - lastAutoExitCheckTime >= AUTO_EXIT_CONSTANTS.CHECK_INTERVAL) {
    lastAutoExitCheckTime = now;
    return true;
  }
  return false;
}

/**
 * 自動退室チェックと処理（非同期実行）
 * 入退室処理のたびに、開放時間終了時刻を過ぎた未退室ユーザーを自動的に退室させる
 * Vercel無料プランでも動作するように、Cron設定なしで実装
 * 
 * パフォーマンス最適化：5分に1回のみ実行
 */
async function checkAndProcessAutoExit(siteId: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const currentTime = new Date();

    // 1. 在籍中で、最終イベントが「入室（entry）」の生徒を取得
    const { data: studentsInBuilding, error: fetchError } = await supabase
      .from("students")
      .select(
        "id, name, role, has_custom_access_time, access_start_time, access_end_time, last_event_type, last_event_timestamp"
      )
      .eq("site_id", siteId)
      .eq("status", "active")
      .eq("last_event_type", "entry");

    if (fetchError) {
      console.error(`[AutoExit] Failed to fetch students:`, fetchError);
      return;
    }

    if (!studentsInBuilding || studentsInBuilding.length === 0) {
      return;
    }

    // 2. 各生徒の開放時間を確認し、終了時刻を過ぎている場合は自動退室
    for (const student of studentsInBuilding) {
      const studentRole = (student.role || "student") as
        | "student"
        | "part_time"
        | "full_time";

      // 生徒の開放時間を取得（個別設定優先、属性設定フォールバック）
      const accessTime = await getStudentAccessTime(
        siteId,
        studentRole,
        student.has_custom_access_time || false,
        student.access_start_time,
        student.access_end_time
      );

      const shouldExit = hasAccessWindowBetween(
        student.last_event_timestamp,
        currentTime,
        accessTime.start_time,
        accessTime.end_time
      );

      if (!shouldExit) {
        continue;
      }

      console.log(`[AutoExit] Processing forced exit for ${student.name} (${student.id})`);

      // 自動退室ログを作成（強制退室として記録）
      const { data: logData, error: logError } = await supabase
        .from("access_logs")
        .insert([
          {
            site_id: siteId,
            student_id: student.id,
            event_type: "forced_exit",
            card_id: null,
            device_id: "auto-exit-system",
            notification_status: "not_required",
          },
        ])
        .select()
        .single();

      if (logError) {
        console.error(
          `[AutoExit] Failed to create log for ${student.name}:`,
          logError
        );
        continue;
      }

      // 生徒の最終イベント情報を更新
      const { error: updateError } = await supabase
        .from("students")
        .update({
          last_event_type: "exit",
          last_event_timestamp: currentTime.toISOString(),
        })
        .eq("id", student.id)
        .eq("site_id", siteId);

      if (updateError) {
        console.warn(
          `[AutoExit] Failed to update student last event for ${student.name}:`,
          updateError
        );
      } else {
        console.log(
          `[AutoExit] Successfully processed forced exit for ${student.name} (${student.id})`
        );
      }

      // LINE通知を送信（生徒の場合のみ）
      if (studentRole === "student") {
        try {
          await sendLineNotificationToParents(
            siteId,
            student.id,
            "forced_exit",
            logData.id,
            student.name
          );
        } catch (notificationError) {
          // LINE通知のエラーはログに記録するが、自動退室処理自体は成功として扱う
          console.error(
            `[AutoExit] Error sending LINE notification for ${student.name}:`,
            notificationError
          );
        }
      }
    }
  } catch (error: any) {
    const errorMessage = error?.message || String(error) || "Unknown error";
    console.error("[AutoExit] Error in checkAndProcessAutoExit:", errorMessage);
  }
}
