/**
 * アクセスログ処理用のヘルパー関数
 */

import {
  getStudentBonusThreshold,
  getStudentBonusPoints,
  hasReceivedPointsToday,
  getMonthlyEntryCount,
  hasReceivedBonusThisMonth,
  addPoints,
} from "@/lib/point-utils";
import { getPointSettings } from "@/lib/point-settings-utils";
import { sendLineNotificationToParents } from "@/lib/line-notification-utils";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * 入室時のポイント付与処理
 * @param siteId サイトID
 * @param studentId 生徒ID
 * @param studentData 生徒データ
 * @param logDataId アクセスログID
 * @returns 付与されたポイント情報
 */
export async function awardPointsOnEntry(
  siteId: string,
  studentId: string,
  studentData: {
    name: string;
    role: string;
    class?: string | null;
    bonus_threshold?: number | null;
    has_custom_bonus_threshold?: boolean;
  },
  logDataId: string
): Promise<{ entry?: number; bonus?: number }> {
  const pointsAwarded: { entry?: number; bonus?: number } = {};

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
        logDataId
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
    const monthlyEntryCount = await getMonthlyEntryCount(siteId, studentId);
    const bonusThreshold = await getStudentBonusThreshold(
      siteId,
      studentData.role as "student" | "part_time" | "full_time",
      studentData.class || null,
      studentData.has_custom_bonus_threshold || false,
      studentData.bonus_threshold || null
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
          logDataId
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

    // ポイントが付与された場合、ログのpoints_awardedをtrueに更新
    if (Object.keys(pointsAwarded).length > 0) {
      const supabase = getSupabaseAdmin();
      const { error: updatePointsError } = await supabase
        .from("access_logs")
        .update({ points_awarded: true })
        .eq("id", logDataId);

      if (updatePointsError) {
        console.warn(`[Points] Failed to update points_awarded flag for log ${logDataId}:`, updatePointsError);
      } else {
        console.log(`[Points] Updated points_awarded flag for log ${logDataId}`);
      }
    }
  } catch (pointsError: any) {
    // ポイント付与のエラーはログに記録するが、入室ログ自体は成功として扱う
    console.error(`[Points] Error awarding points for student ${studentId}:`, pointsError);
  }

  return pointsAwarded;
}

/**
 * LINE通知送信処理
 * @param siteId サイトID
 * @param studentId 生徒ID
 * @param studentName 生徒名
 * @param studentRole 生徒の役割
 * @param eventType イベントタイプ
 * @param logDataId アクセスログID
 */
export async function sendAccessNotification(
  siteId: string,
  studentId: string,
  studentName: string,
  studentRole: string,
  eventType: "entry" | "exit" | "forced_exit",
  logDataId: string
): Promise<void> {
  if (studentRole !== "student") {
    console.log(
      `[LineNotification] ❌ Student role is "${studentRole}", not "student". Skipping LINE notification. (Student: ${studentName}, ID: ${studentId})`
    );
    return;
  }

  console.log(
    `[LineNotification] Sending LINE notification for student ${studentName} (${studentId}), eventType=${eventType}`
  );
  
  try {
    const notificationResult = await sendLineNotificationToParents(
      siteId,
      studentId,
      eventType,
      logDataId,
      studentName
    );

    if (notificationResult.success && notificationResult.sentCount > 0) {
      console.log(
        `[LineNotification] Successfully sent ${notificationResult.sentCount} LINE notification(s) for student ${studentName}`
      );
      // 通知ステータスを更新
      const supabase = getSupabaseAdmin();
      await supabase
        .from("access_logs")
        .update({ notification_status: "sent" })
        .eq("id", logDataId);
    } else if (notificationResult.success && notificationResult.sentCount === 0) {
      console.log(
        `[LineNotification] No active LINE accounts found for student ${studentName}. Skipping notification status update.`
      );
    } else {
      console.error(
        `[LineNotification] Failed to send LINE notification for student ${studentName}: ${notificationResult.error}`
      );
    }
  } catch (notificationError: any) {
    // LINE通知のエラーはログに記録するが、入退室ログ自体は成功として扱う
    console.error(
      `[LineNotification] Error sending LINE notification for student ${studentId}:`,
      notificationError
    );
  }
}
