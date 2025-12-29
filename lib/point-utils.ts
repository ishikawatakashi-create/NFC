import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * 生徒のボーナス閾値を取得する（個別設定優先、クラス設定、属性設定の順）
 * @param siteId サイトID
 * @param studentRole 生徒の属性
 * @param studentClass 生徒のクラス
 * @param hasCustomBonusThreshold 個別設定があるかどうか
 * @param customBonusThreshold 個別設定のボーナス閾値
 * @returns ボーナス閾値
 */
export async function getStudentBonusThreshold(
  siteId: string,
  studentRole: "student" | "part_time" | "full_time",
  studentClass: string | null | undefined,
  hasCustomBonusThreshold: boolean,
  customBonusThreshold: number | null
): Promise<number> {
  // 個別設定がある場合は個別設定を優先
  if (hasCustomBonusThreshold && customBonusThreshold !== null && customBonusThreshold > 0) {
    return customBonusThreshold;
  }

  const supabase = getSupabase();

  // クラス設定を確認
  if (studentClass) {
    const { data: classThreshold } = await supabase
      .from("class_based_bonus_thresholds")
      .select("bonus_threshold")
      .eq("site_id", siteId)
      .eq("class", studentClass)
      .single();

    if (classThreshold && classThreshold.bonus_threshold > 0) {
      return classThreshold.bonus_threshold;
    }
  }

  // 属性設定を確認
  const { data: roleThreshold } = await supabase
    .from("role_based_bonus_thresholds")
    .select("bonus_threshold")
    .eq("site_id", siteId)
    .eq("role", studentRole)
    .single();

  if (roleThreshold && roleThreshold.bonus_threshold > 0) {
    return roleThreshold.bonus_threshold;
  }

  // デフォルト値（設定されていない場合は10回）
  return 10;
}

/**
 * 今日既にポイントが付与されているかチェック
 * @param siteId サイトID
 * @param studentId 生徒ID
 * @returns 今日既にポイントが付与されている場合true
 */
export async function hasReceivedPointsToday(
  siteId: string,
  studentId: string
): Promise<boolean> {
  const supabase = getSupabase();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.toISOString();

  const { data, error } = await supabase
    .from("point_transactions")
    .select("id")
    .eq("site_id", siteId)
    .eq("student_id", studentId)
    .eq("transaction_type", "entry")
    .gte("created_at", todayStart)
    .limit(1);

  if (error) {
    console.error("Failed to check today's points:", error);
    return false;
  }

  return (data?.length || 0) > 0;
}

/**
 * 今月の入室回数を取得
 * @param siteId サイトID
 * @param studentId 生徒ID
 * @returns 今月の入室回数
 */
export async function getMonthlyEntryCount(
  siteId: string,
  studentId: string
): Promise<number> {
  const supabase = getSupabase();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartISO = monthStart.toISOString();

  const { data, error } = await supabase
    .from("access_logs")
    .select("id", { count: "exact" })
    .eq("site_id", siteId)
    .eq("student_id", studentId)
    .eq("event_type", "entry")
    .gte("timestamp", monthStartISO);

  if (error) {
    console.error("Failed to get monthly entry count:", error);
    return 0;
  }

  return data?.length || 0;
}

/**
 * 今月既にボーナスポイントが付与されているかチェック
 * @param siteId サイトID
 * @param studentId 生徒ID
 * @returns 今月既にボーナスポイントが付与されている場合true
 */
export async function hasReceivedBonusThisMonth(
  siteId: string,
  studentId: string
): Promise<boolean> {
  const supabase = getSupabase();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartISO = monthStart.toISOString();

  const { data, error } = await supabase
    .from("point_transactions")
    .select("id")
    .eq("site_id", siteId)
    .eq("student_id", studentId)
    .eq("transaction_type", "bonus")
    .gte("created_at", monthStartISO)
    .limit(1);

  if (error) {
    console.error("Failed to check monthly bonus:", error);
    return false;
  }

  return (data?.length || 0) > 0;
}

/**
 * ポイントを付与する
 * @param siteId サイトID
 * @param studentId 生徒ID
 * @param points 付与するポイント数
 * @param transactionType 取引種別
 * @param description 説明
 * @param referenceId 関連レコードID
 * @returns 成功した場合true
 */
export async function addPoints(
  siteId: string,
  studentId: string,
  points: number,
  transactionType: "entry" | "bonus" | "admin_add",
  description?: string,
  referenceId?: string
): Promise<boolean> {
  const supabase = getSupabase();

  try {
    // トランザクション処理（Supabaseでは直接サポートされていないため、順次実行）
    // 1. ポイント履歴を追加
    const { error: transactionError } = await supabase
      .from("point_transactions")
      .insert([
        {
          site_id: siteId,
          student_id: studentId,
          transaction_type: transactionType,
          points: points,
          description: description || null,
          reference_id: referenceId || null,
        },
      ]);

    if (transactionError) {
      console.error(`[Points] Failed to add point transaction for student ${studentId}:`, transactionError);
      console.error(`[Points] Error details:`, JSON.stringify(transactionError, null, 2));
      return false;
    }

    console.log(`[Points] Point transaction added successfully for student ${studentId}: ${points} points (${transactionType})`);

    // 2. 生徒のポイントを更新
    const { error: updateError } = await supabase.rpc("increment_student_points", {
      student_id_param: studentId,
      points_param: points,
    });

    // RPC関数が存在しない場合は、直接UPDATEを実行
    if (updateError) {
      console.log(`[Points] RPC function not available, using direct UPDATE for student ${studentId}`);
      
      // 現在のポイントを取得
      const { data: studentData, error: fetchError } = await supabase
        .from("students")
        .select("current_points")
        .eq("id", studentId)
        .eq("site_id", siteId)
        .single();

      if (fetchError) {
        console.error(`[Points] Failed to fetch current points for student ${studentId}:`, fetchError);
        console.error(`[Points] Fetch error details:`, JSON.stringify(fetchError, null, 2));
        // 履歴は追加済みなので、ロールバックはしない（手動で修正が必要な場合がある）
        return false;
      }

      const currentPoints = studentData?.current_points ?? 0;
      const newPoints = currentPoints + points;

      console.log(`[Points] Updating points for student ${studentId}: ${currentPoints} + ${points} = ${newPoints}`);

      const { error: updatePointsError } = await supabase
        .from("students")
        .update({ current_points: newPoints })
        .eq("id", studentId)
        .eq("site_id", siteId);

      if (updatePointsError) {
        console.error(`[Points] Failed to update points for student ${studentId}:`, updatePointsError);
        console.error(`[Points] Update error details:`, JSON.stringify(updatePointsError, null, 2));
        // 履歴は追加済みなので、ロールバックはしない（手動で修正が必要な場合がある）
        return false;
      }

      console.log(`[Points] Points updated successfully for student ${studentId}: ${newPoints} points`);
    } else {
      console.log(`[Points] Points updated via RPC for student ${studentId}`);
    }

    return true;
  } catch (e: any) {
    console.error(`[Points] Exception in addPoints for student ${studentId}:`, e);
    console.error(`[Points] Exception details:`, JSON.stringify(e, null, 2));
    return false;
  }
}

/**
 * ポイントを消費する
 * @param siteId サイトID
 * @param studentId 生徒ID
 * @param points 消費するポイント数
 * @param description 説明
 * @returns 成功した場合true
 */
export async function consumePoints(
  siteId: string,
  studentId: string,
  points: number,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  // 現在のポイントを取得
  const { data: studentData, error: fetchError } = await supabase
    .from("students")
    .select("current_points")
    .eq("id", studentId)
    .eq("site_id", siteId)
    .single();

  if (fetchError) {
    return { success: false, error: "ポイント情報の取得に失敗しました" };
  }

  const currentPoints = studentData?.current_points || 0;

  if (currentPoints < points) {
    return { success: false, error: "ポイントが不足しています" };
  }

  // 1. ポイント履歴を追加
  const { error: transactionError } = await supabase
    .from("point_transactions")
    .insert([
      {
        site_id: siteId,
        student_id: studentId,
        transaction_type: "consumption",
        points: -points, // 負の値で記録
        description: description || null,
      },
    ]);

  if (transactionError) {
    return { success: false, error: "ポイント履歴の記録に失敗しました" };
  }

  // 2. 生徒のポイントを更新
  const newPoints = currentPoints - points;

  const { error: updateError } = await supabase
    .from("students")
    .update({ current_points: newPoints })
    .eq("id", studentId)
    .eq("site_id", siteId);

  if (updateError) {
    return { success: false, error: "ポイントの更新に失敗しました" };
  }

  return { success: true };
}

