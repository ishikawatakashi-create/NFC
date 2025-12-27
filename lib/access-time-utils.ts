import { createClient } from "@supabase/supabase-js";

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
 * @param endTime 終了時刻（HH:mm形式）
 * @param currentTime 現在時刻（Dateオブジェクト、省略時は現在時刻）
 * @returns 終了時刻を過ぎている場合true
 */
export function isPastEndTime(
  endTime: string,
  currentTime: Date = new Date()
): boolean {
  const [hours, minutes] = endTime.split(":").map(Number);
  const endDate = new Date(currentTime);
  endDate.setHours(hours, minutes, 0, 0);

  return currentTime > endDate;
}

