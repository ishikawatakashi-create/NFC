import { createClient } from "@supabase/supabase-js";
import { buildJstDate, getJstDayStart } from "@/lib/timezone-utils";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * 属性に紐づいた開放時間を取得する
 * @param siteId サイトID
 * @param role 属性（student, part_time, full_time）
 * @returns 開始時刻と終了時刻のオブジェクト、またはnull
 */
export async function getRoleBasedAccessTime(
  siteId: string,
  role: "student" | "part_time" | "full_time"
): Promise<{ start_time: string; end_time: string } | null> {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("role_based_access_times")
      .select("start_time, end_time")
      .eq("site_id", siteId)
      .eq("role", role)
      .single();

    if (error) {
      // データが存在しない場合はデフォルト値を返す
      if (error.code === "PGRST116") {
        // デフォルト値
        return {
          start_time: "09:00",
          end_time: "20:00",
        };
      }
      console.error("Failed to get role-based access time:", error);
      return null;
    }

    if (!data) {
      // デフォルト値
      return {
        start_time: "09:00",
        end_time: "20:00",
      };
    }

    return {
      start_time: data.start_time,
      end_time: data.end_time,
    };
  } catch (e: any) {
    console.error("Error in getRoleBasedAccessTime:", e);
    // エラー時はデフォルト値を返す
    return {
      start_time: "09:00",
      end_time: "20:00",
    };
  }
}

/**
 * 生徒の開放時間を取得する（個別設定優先、属性設定フォールバック）
 * @param siteId サイトID
 * @param studentRole 生徒の属性（student, part_time, full_time）
 * @param hasCustomAccessTime 個別設定があるかどうか
 * @param customStartTime 個別設定の開始時刻（NULLの場合は属性設定を使用）
 * @param customEndTime 個別設定の終了時刻（NULLの場合は属性設定を使用）
 * @returns 開始時刻と終了時刻のオブジェクト
 */
export async function getStudentAccessTime(
  siteId: string,
  studentRole: "student" | "part_time" | "full_time",
  hasCustomAccessTime: boolean,
  customStartTime: string | null,
  customEndTime: string | null
): Promise<{ start_time: string; end_time: string }> {
  // 個別設定がある場合は個別設定を優先
  if (hasCustomAccessTime && customStartTime && customEndTime) {
    return {
      start_time: customStartTime,
      end_time: customEndTime,
    };
  }

  // 属性に紐づいた開放時間を取得
  const roleBasedTime = await getRoleBasedAccessTime(siteId, studentRole);
  if (roleBasedTime) {
    return roleBasedTime;
  }

  // デフォルト値
  return {
    start_time: "09:00",
    end_time: "20:00",
  };
}

/**
 * 現在時刻が開放時間終了時刻を過ぎているかチェック
 * @param endTime 終了時刻（HH:mm形式またはHH:mm:ss形式）
 * @param currentTime 現在時刻（Dateオブジェクト、省略時は現在時刻）
 * @returns 終了時刻を過ぎている場合true
 */
export function isPastEndTime(
  endTime: string,
  currentTime: Date = new Date()
): boolean {
  // HH:mm形式またはHH:mm:ss形式に対応
  const timeParts = endTime.split(":");
  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);
  
  // JSTの同日を基準に終了時刻を構築
  const endDate = buildJstDate(currentTime, hours, minutes, 0);
  
  // 現在時刻が終了時刻を過ぎているかチェック（同じ時刻も「過ぎている」と判定）
  const isPast = currentTime >= endDate;
  
  // デバッグログ（開発環境のみ）
  if (process.env.NODE_ENV === 'development') {
    console.log(`[isPastEndTime] endTime=${endTime}, currentTime=${currentTime.toISOString()}, endDate=${endDate.toISOString()}, isPast=${isPast}`);
  }
  
  return isPast;
}

function parseTimeParts(timeValue: string): { hours: number; minutes: number } {
  const timeParts = timeValue.split(":");
  return {
    hours: parseInt(timeParts[0], 10),
    minutes: parseInt(timeParts[1], 10),
  };
}

function getWindowForDate(
  baseDate: Date,
  startTime: string,
  endTime: string
): { start: Date; end: Date } {
  const startParts = parseTimeParts(startTime);
  const endParts = parseTimeParts(endTime);

  const baseDayStart = getJstDayStart(baseDate);
  const start = new Date(
    baseDayStart.getTime() +
      (startParts.hours * 60 + startParts.minutes) * 60 * 1000
  );

  const end = new Date(
    baseDayStart.getTime() +
      (endParts.hours * 60 + endParts.minutes) * 60 * 1000
  );

  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  return { start, end };
}

/**
 * 最終イベント時刻と現在時刻の間に開放時間が含まれるかチェック
 * @param lastEventTimestamp 最終イベント時刻（ISO文字列）
 * @param currentTime 現在時刻
 * @param startTime 開始時刻（HH:mm）
 * @param endTime 終了時刻（HH:mm）
 * @returns 開放時間が1回でも含まれる場合true
 */
export function hasAccessWindowBetween(
  lastEventTimestamp: string | null | undefined,
  currentTime: Date,
  startTime: string,
  endTime: string
): boolean {
  if (!lastEventTimestamp) {
    return isPastEndTime(endTime, currentTime);
  }

  const lastEvent = new Date(lastEventTimestamp);
  if (Number.isNaN(lastEvent.getTime())) {
    return isPastEndTime(endTime, currentTime);
  }

  const startDay = getJstDayStart(lastEvent);
  const endDay = getJstDayStart(currentTime);

  for (
    let day = new Date(startDay);
    day <= endDay;
    day = new Date(day.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const { start, end } = getWindowForDate(day, startTime, endTime);
    if (end > lastEvent && start <= currentTime) {
      return true;
    }
  }

  return false;
}
