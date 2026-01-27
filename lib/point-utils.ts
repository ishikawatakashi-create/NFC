import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { POINT_CONSTANTS } from "@/lib/constants";
import { getJstDayStart, getJstMonthStart } from "@/lib/timezone-utils";

function getSupabase() {
  // サービスロールキーを使用してRLSをバイパス
  return getSupabaseAdmin();
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

  // デフォルト値（設定されていない場合）
  return POINT_CONSTANTS.DEFAULT_BONUS_THRESHOLD;
}

/**
 * 生徒のボーナスポイント数を取得する（クラス設定を優先、デフォルトは3点）
 * @param siteId サイトID
 * @param studentClass 生徒のクラス
 * @returns ボーナスポイント数
 */
export async function getStudentBonusPoints(
  siteId: string,
  studentClass: string | null | undefined
): Promise<number> {
  const supabase = getSupabase();

  // クラス設定を確認
  if (studentClass) {
    const { data: classSettings } = await supabase
      .from("class_based_bonus_thresholds")
      .select("bonus_points")
      .eq("site_id", siteId)
      .eq("class", studentClass)
      .single();

    if (classSettings && classSettings.bonus_points > 0) {
      return classSettings.bonus_points;
    }
  }

  // デフォルト値（設定されていない場合）
  return POINT_CONSTANTS.DEFAULT_BONUS_POINTS;
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

  const todayStart = getJstDayStart().toISOString();

  // ポイントが実際に付与されたトランザクション（points > 0）をチェック
  const { data, error } = await supabase
    .from("point_transactions")
    .select("id, points")
    .eq("site_id", siteId)
    .eq("student_id", studentId)
    .eq("transaction_type", "entry")
    .gt("points", 0) // ポイントが0より大きいもののみ
    .gte("created_at", todayStart)
    .limit(1);

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[Points] Failed to check today's points for student ${studentId}:`, error);
    }
    return false;
  }

  const hasReceived = (data?.length || 0) > 0;
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Points] Student ${studentId}: hasReceivedPointsToday=${hasReceived}`);
  }
  return hasReceived;
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

  const monthStartISO = getJstMonthStart().toISOString();

  const { count, error } = await supabase
    .from("access_logs")
    .select("id", { count: "exact", head: true })
    .eq("site_id", siteId)
    .eq("student_id", studentId)
    .eq("event_type", "entry")
    .gte("timestamp", monthStartISO);

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("Failed to get monthly entry count:", error);
    }
    return 0;
  }

  return count || 0;
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

  const monthStartISO = getJstMonthStart().toISOString();

  const { data, error } = await supabase
    .from("point_transactions")
    .select("id")
    .eq("site_id", siteId)
    .eq("student_id", studentId)
    .eq("transaction_type", "bonus")
    .gte("created_at", monthStartISO)
    .limit(1);

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("Failed to check monthly bonus:", error);
    }
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
 * @param adminId 管理者ID（admin_addの場合のみ）
 * @returns 成功した場合true
 */
export async function addPoints(
  siteId: string,
  studentId: string,
  points: number,
  transactionType: "entry" | "bonus" | "admin_add",
  description?: string,
  referenceId?: string,
  adminId?: string
): Promise<boolean> {
  const supabase = getSupabase();

  try {
    // RPC関数を使用してトランザクション処理（推奨）
    let useFallback = false;
    try {
      const { data, error: rpcError } = await supabase.rpc("add_points_transaction", {
        p_site_id: siteId,
        p_student_id: studentId,
        p_points: points,
        p_transaction_type: transactionType,
        p_description: description || null,
        p_reference_id: referenceId || null,
        p_admin_id: adminId || null,
      });

      if (!rpcError && data === true) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Points] Points added successfully via RPC for student ${studentId}: ${points} points (${transactionType})`);
        }
        return true;
      }

      // RPC関数が存在しない、またはエラーが発生した場合はフォールバック処理
      if (rpcError) {
        // RPC関数が存在しない場合（PGRST116エラー）はフォールバックに進む
        if (rpcError.code === 'PGRST116' || rpcError.message?.includes('function') || rpcError.message?.includes('does not exist')) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[Points] RPC function not available, using fallback for student ${studentId}`);
          }
          useFallback = true;
        } else {
          // その他のエラー（制約違反など）はエラーとして返す
          if (process.env.NODE_ENV === 'development') {
            console.error(`[Points] RPC function error for student ${studentId}:`, rpcError);
            console.error(`[Points] RPC error details:`, JSON.stringify(rpcError, null, 2));
          }
          // エラーメッセージを返すためにfalseを返す（フォールバック処理に進む）
          useFallback = true;
        }
      } else if (data !== true) {
        // RPC関数がfalseを返した場合
        if (process.env.NODE_ENV === 'development') {
          console.error(`[Points] RPC function returned false for student ${studentId}`);
        }
        useFallback = true;
      }
    } catch (rpcException: any) {
      // RPC関数呼び出し自体が例外を投げた場合
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Points] RPC function exception for student ${studentId}:`, rpcException);
      }
      useFallback = true;
    }

    if (!useFallback) {
      return true;
    }

    // フォールバック: 順次実行（エラー時にロールバック）
    let transactionId: string | null = null;

    // 1. ポイント履歴を追加
    const transactionData: any = {
      site_id: siteId,
      student_id: studentId,
      transaction_type: transactionType,
      points: points,
      description: description || null,
      reference_id: referenceId || null,
    };
    
    // 管理者による操作の場合は管理者IDを記録
    if (transactionType === "admin_add" && adminId) {
      transactionData.admin_id = adminId;
    }
    
    let { data: insertedData, error: transactionError } = await supabase
      .from("point_transactions")
      .insert([transactionData])
      .select("id")
      .single();

    // admin_idカラムが存在しない場合のエラーを処理
    // PGRST204: 列が見つからないエラー
    // 42703: PostgreSQL の "undefined column" エラー
    if (transactionError && adminId && (
      transactionError.code === "PGRST204" ||
      transactionError.code === "42703"
    )) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Points] admin_id column not available, retrying without admin_id for student ${studentId}`);
      }
      // admin_idなしで再試行
      const transactionDataWithoutAdmin = { ...transactionData };
      delete transactionDataWithoutAdmin.admin_id;
      
      const retryResult = await supabase
        .from("point_transactions")
        .insert([transactionDataWithoutAdmin])
        .select("id")
        .single();
      
      if (!retryResult.error && retryResult.data) {
        insertedData = retryResult.data;
        transactionError = null;
      } else {
        transactionError = retryResult.error;
      }
    }

    if (transactionError || !insertedData) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Points] Failed to add point transaction for student ${studentId}:`, transactionError);
        console.error(`[Points] Transaction data:`, JSON.stringify(transactionData, null, 2));
        console.error(`[Points] Transaction error details:`, JSON.stringify(transactionError, null, 2));
      }
      return false;
    }

    transactionId = insertedData.id;

    // 2. 生徒のポイントを更新
    const { error: updateError } = await supabase.rpc("increment_student_points", {
      student_id_param: studentId,
      points_param: points,
    });

    // RPC関数が存在しない場合は、直接UPDATEを実行
    if (updateError) {
      // 現在のポイントを取得
      const { data: studentData, error: fetchError } = await supabase
        .from("students")
        .select("current_points")
        .eq("id", studentId)
        .eq("site_id", siteId)
        .single();

      if (fetchError) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`[Points] Failed to fetch current points for student ${studentId}:`, fetchError);
        }
        // ロールバック: 履歴を削除
        if (transactionId) {
          await supabase.from("point_transactions").delete().eq("id", transactionId);
        }
        return false;
      }

      const currentPoints = studentData?.current_points ?? 0;
      const newPoints = currentPoints + points;

      const { error: updatePointsError } = await supabase
        .from("students")
        .update({ current_points: newPoints })
        .eq("id", studentId)
        .eq("site_id", siteId);

      if (updatePointsError) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`[Points] Failed to update points for student ${studentId}:`, updatePointsError);
        }
        // ロールバック: 履歴を削除
        if (transactionId) {
          await supabase.from("point_transactions").delete().eq("id", transactionId);
        }
        return false;
      }
    } else {
      // RPC関数が成功した場合
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Points] Points updated via RPC for student ${studentId}`);
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Points] Points added successfully for student ${studentId}: ${points} points (${transactionType})`);
    }

    return true;
  } catch (e: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[Points] Exception in addPoints for student ${studentId}:`, e);
      console.error(`[Points] Exception details:`, JSON.stringify(e, null, 2));
    }
    return false;
  }
}

/**
 * ポイントを消費する
 * @param siteId サイトID
 * @param studentId 生徒ID
 * @param points 消費するポイント数
 * @param description 説明
 * @param adminId 管理者ID（管理者による減算の場合のみ）
 * @returns 成功した場合true
 */
export async function consumePoints(
  siteId: string,
  studentId: string,
  points: number,
  description?: string,
  adminId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  try {
    const transactionType = adminId ? "admin_subtract" : "consumption";

    // RPC関数を使用してトランザクション処理（推奨）
    let useFallback = false;
    let rpcErrorMessage: string | undefined = undefined;
    
    try {
      const { data, error: rpcError } = await supabase.rpc("subtract_points_transaction", {
        p_site_id: siteId,
        p_student_id: studentId,
        p_points: points,
        p_transaction_type: transactionType,
        p_description: description || null,
        p_admin_id: adminId || null,
      });

      if (!rpcError && data === true) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Points] Points subtracted successfully via RPC for student ${studentId}: ${points} points`);
        }
        return { success: true };
      }

      // RPC関数が存在しない、またはエラーが発生した場合はフォールバック処理
      if (rpcError) {
        // エラーメッセージからポイント不足を判定
        if (rpcError.message?.includes("Insufficient points") || rpcError.message?.includes("不足")) {
          return { success: false, error: "ポイントが不足しています" };
        }
        
        // RPC関数が存在しない場合（PGRST116エラー）はフォールバックに進む
        if (rpcError.code === 'PGRST116' || rpcError.message?.includes('function') || rpcError.message?.includes('does not exist')) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[Points] RPC function not available, using fallback for student ${studentId}`);
          }
          useFallback = true;
        } else {
          // その他のエラーは詳細をログに記録
          if (process.env.NODE_ENV === 'development') {
            console.error(`[Points] RPC function error for student ${studentId}:`, rpcError);
            console.error(`[Points] RPC error details:`, JSON.stringify(rpcError, null, 2));
          }
          // エラーメッセージを保存してフォールバックに進む
          rpcErrorMessage = rpcError.message || "ポイントの減算に失敗しました";
          useFallback = true;
        }
      } else if (data !== true) {
        // RPC関数がfalseを返した場合
        if (process.env.NODE_ENV === 'development') {
          console.error(`[Points] RPC function returned false for student ${studentId}`);
        }
        useFallback = true;
      }
    } catch (rpcException: any) {
      // RPC関数呼び出し自体が例外を投げた場合
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Points] RPC function exception for student ${studentId}:`, rpcException);
      }
      useFallback = true;
    }

    if (!useFallback) {
      return { success: true };
    }

    // フォールバック: 順次実行（エラー時にロールバック）
    // 現在のポイントを取得
    const { data: studentData, error: fetchError } = await supabase
      .from("students")
      .select("current_points")
      .eq("id", studentId)
      .eq("site_id", siteId)
      .single();

    if (fetchError) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Points] Failed to fetch current points for student ${studentId}:`, fetchError);
      }
      return { success: false, error: `ポイント情報の取得に失敗しました: ${fetchError?.message || fetchError?.details || "Unknown error"}` };
    }

    const currentPoints = studentData?.current_points || 0;

    if (currentPoints < points) {
      return { success: false, error: `ポイントが不足しています（現在: ${currentPoints}pt、必要: ${points}pt）` };
    }

    // 1. ポイント履歴を追加
    const transactionData: any = {
      site_id: siteId,
      student_id: studentId,
      transaction_type: transactionType,
      points: -points, // 負の値で記録
      description: description || null,
    };
    
    // 管理者による操作の場合は管理者IDを記録（admin_idカラムが存在する場合のみ）
    // マイグレーションが未実行の場合でも動作するように、エラー時はadmin_idなしで再試行
    if (adminId) {
      // まずadmin_idを含めて試行
      transactionData.admin_id = adminId;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Points] Inserting transaction for student ${studentId}:`, JSON.stringify(transactionData, null, 2));
    }
    
    let { data: insertedData, error: transactionError } = await supabase
      .from("point_transactions")
      .insert([transactionData])
      .select("id")
      .single();

    // admin_idカラムが存在しない場合のエラーを処理
    // PGRST204: 列が見つからないエラー
    // 42703: PostgreSQL の "undefined column" エラー
    if (transactionError && adminId && (
      transactionError.code === "PGRST204" ||
      transactionError.code === "42703"
    )) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Points] admin_id column not available, retrying without admin_id for student ${studentId}`);
      }
      // admin_idなしで再試行
      const transactionDataWithoutAdmin = { ...transactionData };
      delete transactionDataWithoutAdmin.admin_id;
      
      const retryResult = await supabase
        .from("point_transactions")
        .insert([transactionDataWithoutAdmin])
        .select("id")
        .single();
      
      if (!retryResult.error && retryResult.data) {
        insertedData = retryResult.data;
        transactionError = null;
      } else {
        transactionError = retryResult.error;
      }
    }

    if (transactionError || !insertedData) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Points] Failed to insert point transaction for student ${studentId}:`, transactionError);
        console.error(`[Points] Transaction data:`, JSON.stringify(transactionData, null, 2));
        console.error(`[Points] Error code:`, transactionError?.code);
        console.error(`[Points] Error message:`, transactionError?.message);
        console.error(`[Points] Error details:`, transactionError?.details);
        console.error(`[Points] Error hint:`, transactionError?.hint);
      }
      return { 
        success: false, 
        error: transactionError?.message || transactionError?.details || transactionError?.hint || "ポイント履歴の記録に失敗しました" 
      };
    }

    const transactionId = insertedData.id;

    // 2. 生徒のポイントを更新
    const newPoints = currentPoints - points;

    const { error: updateError } = await supabase
      .from("students")
      .update({ current_points: newPoints })
      .eq("id", studentId)
      .eq("site_id", siteId);

    if (updateError) {
      // ロールバック: 履歴を削除
      await supabase.from("point_transactions").delete().eq("id", transactionId);
      return { success: false, error: "ポイントの更新に失敗しました" };
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Points] Points subtracted successfully for student ${studentId}: ${points} points`);
    }

    // RPCエラーメッセージがある場合は返す（フォールバックが成功した場合でも警告として）
    if (rpcErrorMessage && process.env.NODE_ENV === 'development') {
      console.warn(`[Points] RPC function failed but fallback succeeded for student ${studentId}: ${rpcErrorMessage}`);
    }

    return { success: true };
  } catch (e: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[Points] Exception in consumePoints for student ${studentId}:`, e);
      console.error(`[Points] Exception details:`, JSON.stringify(e, null, 2));
    }
    return { success: false, error: e?.message || "ポイントの減算に失敗しました" };
  }
}
