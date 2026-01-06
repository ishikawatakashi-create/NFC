import { createClient } from "@supabase/supabase-js";

/**
 * LINE Messaging APIを使用してメッセージを送信する
 * @param lineChannelAccessToken LINE Messaging APIのチャネルアクセストークン
 * @param lineUserId LINEユーザーID
 * @param message 送信するメッセージ
 * @returns 送信結果
 */
export async function sendLineMessage(
  lineChannelAccessToken: string,
  lineUserId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lineChannelAccessToken}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [
          {
            type: "text",
            text: message,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.message || `LINE API error: ${response.status} ${response.statusText}`;
      console.error(`[LineNotification] Failed to send message:`, errorMessage);
      return { success: false, error: errorMessage };
    }

    return { success: true };
  } catch (error: any) {
    const errorMessage = error?.message || String(error) || "Unknown error";
    console.error(`[LineNotification] Error sending message:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * 生徒の入退室時に親御さんにLINE通知を送信する
 * @param siteId サイトID
 * @param studentId 生徒ID
 * @param eventType イベント種別（entry, exit, forced_exit）
 * @param accessLogId 入退室ログID
 * @param studentName 生徒名
 * @returns 送信結果
 */
export async function sendLineNotificationToParents(
  siteId: string,
  studentId: string,
  eventType: "entry" | "exit" | "forced_exit",
  accessLogId: string,
  studentName: string
): Promise<{ success: boolean; sentCount: number; error?: string }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const lineChannelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!lineChannelAccessToken) {
    console.warn(
      "[LineNotification] LINE_CHANNEL_ACCESS_TOKEN is not set. Skipping LINE notification."
    );
    return { success: false, sentCount: 0, error: "LINE_CHANNEL_ACCESS_TOKEN is not set" };
  }

  try {
    // 1. 生徒に紐づいている親御さんを取得
    const { data: parentStudents, error: fetchError } = await supabase
      .from("parent_students")
      .select(
        `
        parent_id,
        is_primary,
        parents!inner(
          id,
          name
        )
      `
      )
      .eq("student_id", studentId);

    if (fetchError) {
      const errorMessage = fetchError.message || String(fetchError);
      console.error(`[LineNotification] Failed to fetch parent students:`, errorMessage);
      return { success: false, sentCount: 0, error: errorMessage };
    }

    if (!parentStudents || parentStudents.length === 0) {
      console.log(
        `[LineNotification] No parents found for student ${studentId}. Skipping notification.`
      );
      return { success: true, sentCount: 0 };
    }

    // 2. 各親御さんのアクティブなLINEアカウント情報を取得
    const parentIds = parentStudents.map((ps: any) => ps.parents.id);
    const { data: lineAccounts, error: lineAccountsError } = await supabase
      .from("parent_line_accounts")
      .select("id, parent_id, line_user_id, line_display_name, is_active")
      .in("parent_id", parentIds)
      .eq("is_active", true);

    if (lineAccountsError) {
      const errorMessage = lineAccountsError.message || String(lineAccountsError);
      console.error(`[LineNotification] Failed to fetch LINE accounts:`, errorMessage);
      return { success: false, sentCount: 0, error: errorMessage };
    }

    if (!lineAccounts || lineAccounts.length === 0) {
      console.log(
        `[LineNotification] No active LINE accounts found for student ${studentId}. Skipping notification.`
      );
      return { success: true, sentCount: 0 };
    }

    // 3. 親御さんIDをキーにしたマップを作成
    const lineAccountsMap = new Map(
      lineAccounts.map((acc: any) => [acc.parent_id, acc])
    );

    // 4. 通知テンプレートを取得
    const { data: pointSettings } = await supabase
      .from("point_settings")
      .select("entry_notification_template, exit_notification_template")
      .eq("site_id", siteId)
      .single();

    // 5. イベント種別に応じたメッセージテンプレートを取得
    let messageTemplate: string;
    if (eventType === "entry") {
      messageTemplate = pointSettings?.entry_notification_template || "[生徒名]さんが入室しました。\n時刻: [現在時刻]";
    } else if (eventType === "exit") {
      messageTemplate = pointSettings?.exit_notification_template || "[生徒名]さんが退室しました。\n時刻: [現在時刻]";
    } else {
      // forced_exitの場合は退室テンプレートを使用（「自動退室」と明記）
      messageTemplate = pointSettings?.exit_notification_template 
        ? pointSettings.exit_notification_template.replace("退室しました", "自動退室しました")
        : "[生徒名]さんが自動退室しました。\n時刻: [現在時刻]";
    }

    // 6. タグを置換してメッセージを作成
    const timestamp = new Date().toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    
    const fullMessage = messageTemplate
      .replace(/\[生徒名\]/g, studentName)
      .replace(/\[現在時刻\]/g, timestamp);

    // 7. 各親御さんにLINE通知を送信
    let sentCount = 0;
    const notificationLogs: Array<{
      site_id: string;
      access_log_id: string;
      parent_id: string;
      student_id: string;
      event_type: string;
      line_user_id: string;
      message_sent: string;
      status: string;
      error_message?: string;
    }> = [];

    for (const parentStudent of parentStudents) {
      const parent = parentStudent.parents as any;
      const parentId = parent.id;
      const lineAccount = lineAccountsMap.get(parentId);

      if (!lineAccount) {
        continue;
      }

      const lineUserId = lineAccount.line_user_id;

      // LINEメッセージを送信
      const sendResult = await sendLineMessage(
        lineChannelAccessToken,
        lineUserId,
        fullMessage
      );

      // 通知ログに記録
      notificationLogs.push({
        site_id: siteId,
        access_log_id: accessLogId,
        parent_id: parentId,
        student_id: studentId,
        event_type: eventType,
        line_user_id: lineUserId,
        message_sent: fullMessage,
        status: sendResult.success ? "success" : "failed",
        error_message: sendResult.error || null,
      });

      if (sendResult.success) {
        sentCount++;
        console.log(
          `[LineNotification] Successfully sent notification to parent ${parentId} (LINE User: ${lineUserId})`
        );
      } else {
        console.error(
          `[LineNotification] Failed to send notification to parent ${parentId} (LINE User: ${lineUserId}): ${sendResult.error}`
        );
      }
    }

    // 8. 通知ログをデータベースに保存
    if (notificationLogs.length > 0) {
      const { error: logError } = await supabase
        .from("line_notification_logs")
        .insert(notificationLogs);

      if (logError) {
        console.error(`[LineNotification] Failed to save notification logs:`, logError);
      }
    }

    return { success: true, sentCount };
  } catch (error: any) {
    const errorMessage = error?.message || String(error) || "Unknown error";
    console.error(`[LineNotification] Error sending notifications:`, errorMessage);
    return { success: false, sentCount: 0, error: errorMessage };
  }
}

/**
 * 親御さんのLINEアカウント情報を取得する
 * @param siteId サイトID
 * @param parentId 親御さんID
 * @returns LINEアカウント情報
 */
export async function getParentLineAccount(
  siteId: string,
  parentId: string
): Promise<{
  success: boolean;
  data?: {
    id: string;
    line_user_id: string;
    line_display_name: string | null;
    is_active: boolean;
  } | null;
  error?: string;
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const { data, error } = await supabase
      .from("parent_line_accounts")
      .select("id, line_user_id, line_display_name, is_active")
      .eq("parent_id", parentId)
      .eq("is_active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // レコードが見つからない
        return { success: true, data: null };
      }
      const errorMessage = error.message || String(error);
      return { success: false, error: errorMessage };
    }

    return { success: true, data: data || null };
  } catch (error: any) {
    const errorMessage = error?.message || String(error) || "Unknown error";
    return { success: false, error: errorMessage };
  }
}

