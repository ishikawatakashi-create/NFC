import { env } from "@/lib/env";

/**
 * LINE Webhook処理のユーティリティ関数
 */

/**
 * LINEプロフィール情報を取得する
 * @param lineUserId LINE ユーザーID
 * @returns プロフィール情報（displayName, pictureUrl）またはnull
 */
export async function getLineProfile(
  lineUserId: string
): Promise<{ displayName: string | null; pictureUrl: string | null } | null> {
  try {
    const lineChannelAccessToken = env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!lineChannelAccessToken) {
      console.warn("[LineWebhook] LINE_CHANNEL_ACCESS_TOKEN is not set");
      return null;
    }

    const profileResponse = await fetch(
      `https://api.line.me/v2/bot/profile/${lineUserId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${lineChannelAccessToken}`,
        },
      }
    );

    if (!profileResponse.ok) {
      console.error(
        `[LineWebhook] Failed to fetch profile for ${lineUserId}: ${profileResponse.status}`
      );
      return null;
    }

    const profileData = await profileResponse.json();
    return {
      displayName: profileData.displayName || null,
      pictureUrl: profileData.pictureUrl || null,
    };
  } catch (error) {
    console.error(`[LineWebhook] Error fetching profile for ${lineUserId}:`, error);
    return null;
  }
}

/**
 * LINE友だち情報を保存または更新する
 * @param supabase Supabaseクライアント
 * @param siteId サイトID
 * @param lineUserId LINE ユーザーID
 * @param timestamp イベントのタイムスタンプ
 * @param eventType イベント種別（follow, message, or postback）
 */
export async function saveOrUpdateLineFollower(
  supabase: any,
  siteId: string,
  lineUserId: string,
  timestamp: number,
  eventType: "follow" | "message" | "postback"
): Promise<void> {
  try {
    // LINEプロフィール情報を取得
    const profile = await getLineProfile(lineUserId);
    const displayName = profile?.displayName || null;
    const pictureUrl = profile?.pictureUrl || null;

    // line_followersテーブルに保存（またはアクティブ化）
    const { data: existingFollower, error: checkFollowerError } = await supabase
      .from("line_followers")
      .select("id")
      .eq("site_id", siteId)
      .eq("line_user_id", lineUserId)
      .single();

    if (checkFollowerError && checkFollowerError.code !== "PGRST116") {
      console.error(
        `[LineWebhook] Error checking existing follower:`,
        checkFollowerError
      );
      return;
    }

    if (existingFollower) {
      // 既存の友だちをアクティブ化
      const updateData: any = {
        is_active: true,
        unfollowed_at: null,
        line_display_name: displayName,
        picture_url: pictureUrl,
        updated_at: new Date().toISOString(),
      };

      // followイベントの場合のみfollowed_atを更新
      if (eventType === "follow") {
        updateData.followed_at = new Date(timestamp).toISOString();
      }

      const { error: updateFollowerError } = await supabase
        .from("line_followers")
        .update(updateData)
        .eq("id", existingFollower.id);

      if (updateFollowerError) {
        console.error(
          `[LineWebhook] Error updating follower:`,
          updateFollowerError
        );
      } else {
        const action = eventType === "follow" ? "Reactivated" : "Updated";
        console.log(`[LineWebhook] ${action} LINE follower: ${lineUserId}`);
      }
    } else {
      // 新規友だちを保存
      const { error: insertFollowerError } = await supabase
        .from("line_followers")
        .insert({
          site_id: siteId,
          line_user_id: lineUserId,
          line_display_name: displayName,
          picture_url: pictureUrl,
          is_active: true,
          followed_at: new Date(timestamp).toISOString(),
        });

      if (insertFollowerError) {
        console.error(
          `[LineWebhook] Error inserting follower:`,
          insertFollowerError
        );
      } else {
        console.log(`[LineWebhook] Saved new LINE follower: ${lineUserId}`);
      }
    }
  } catch (error) {
    console.error(
      `[LineWebhook] Error saving/updating follower for ${lineUserId}:`,
      error
    );
  }
}

/**
 * parent_line_accountsテーブルのLINEアカウントをアクティブ化する
 * @param supabase Supabaseクライアント
 * @param lineUserId LINE ユーザーID
 * @param timestamp イベントのタイムスタンプ
 */
export async function reactivateParentLineAccount(
  supabase: any,
  lineUserId: string,
  timestamp: number
): Promise<void> {
  try {
    // 既存のLINEアカウント情報を確認
    const { data: existingAccount, error: checkError } = await supabase
      .from("parent_line_accounts")
      .select("id, parent_id, is_active")
      .eq("line_user_id", lineUserId)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error(
        `[LineWebhook] Error checking existing account:`,
        checkError
      );
      return;
    }

    if (existingAccount) {
      // 既存のアカウントがある場合、アクティブ化
      const { error: updateError } = await supabase
        .from("parent_line_accounts")
        .update({
          is_active: true,
          subscribed_at: new Date(timestamp).toISOString(),
          unsubscribed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingAccount.id);

      if (updateError) {
        console.error(`[LineWebhook] Error updating account:`, updateError);
      } else {
        console.log(
          `[LineWebhook] Reactivated LINE account for parent ${existingAccount.parent_id}`
        );
      }
    }
  } catch (error) {
    console.error(
      `[LineWebhook] Error reactivating parent account for ${lineUserId}:`,
      error
    );
  }
}
