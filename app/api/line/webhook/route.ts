import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * LINE Webhookエンドポイント
 * LINE公式アカウントと友だちになった際や、メッセージを受信した際に呼び出される
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const events = body.events || [];

    const siteId = process.env.SITE_ID;
    if (!siteId) {
      console.error("[LineWebhook] SITE_ID is not set");
      return NextResponse.json({ ok: false, error: "SITE_ID is not set" }, { status: 500 });
    }

    const supabase = getSupabaseAdmin();

    // 各イベントを処理
    for (const event of events) {
      // 友だち追加イベント
      if (event.type === "follow") {
        const lineUserId = event.source.userId;
        const timestamp = event.timestamp;

        console.log(`[LineWebhook] Follow event received: lineUserId=${lineUserId}`);

        // 既存のLINEアカウント情報を確認
        const { data: existingAccount, error: checkError } = await supabase
          .from("parent_line_accounts")
          .select("id, parent_id, is_active")
          .eq("line_user_id", lineUserId)
          .single();

        if (checkError && checkError.code !== "PGRST116") {
          // PGRST116は「レコードが見つからない」エラーなので無視
          console.error(`[LineWebhook] Error checking existing account:`, checkError);
          continue;
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

        // LINE友だち情報を取得して保存
        try {
          const lineChannelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
          if (lineChannelAccessToken) {
            // LINEプロフィール情報を取得
            const profileResponse = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${lineChannelAccessToken}`,
              },
            });

            let displayName = null;
            let pictureUrl = null;

            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              displayName = profileData.displayName || null;
              pictureUrl = profileData.pictureUrl || null;
            }

            // line_followersテーブルに保存（またはアクティブ化）
            const { data: existingFollower, error: checkFollowerError } = await supabase
              .from("line_followers")
              .select("id")
              .eq("site_id", siteId)
              .eq("line_user_id", lineUserId)
              .single();

            if (checkFollowerError && checkFollowerError.code !== "PGRST116") {
              console.error(`[LineWebhook] Error checking existing follower:`, checkFollowerError);
            } else if (existingFollower) {
              // 既存の友だちをアクティブ化
              const { error: updateFollowerError } = await supabase
                .from("line_followers")
                .update({
                  is_active: true,
                  followed_at: new Date(timestamp).toISOString(),
                  unfollowed_at: null,
                  line_display_name: displayName,
                  picture_url: pictureUrl,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingFollower.id);

              if (updateFollowerError) {
                console.error(`[LineWebhook] Error updating follower:`, updateFollowerError);
              } else {
                console.log(`[LineWebhook] Reactivated LINE follower: ${lineUserId}`);
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
                console.error(`[LineWebhook] Error inserting follower:`, insertFollowerError);
              } else {
                console.log(`[LineWebhook] Saved new LINE follower: ${lineUserId}`);
              }
            }
          }
        } catch (profileError) {
          console.error(`[LineWebhook] Error fetching/saving profile:`, profileError);
        }
      }

      // 友だち解除イベント
      if (event.type === "unfollow") {
        const lineUserId = event.source.userId;
        const timestamp = event.timestamp;

        console.log(`[LineWebhook] Unfollow event received: lineUserId=${lineUserId}`);

        // LINEアカウントを非アクティブ化
        const { error: updateError } = await supabase
          .from("parent_line_accounts")
          .update({
            is_active: false,
            unsubscribed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("line_user_id", lineUserId);

        if (updateError) {
          console.error(`[LineWebhook] Error deactivating account:`, updateError);
        } else {
          console.log(`[LineWebhook] Deactivated LINE account: ${lineUserId}`);
        }

        // line_followersテーブルも非アクティブ化
        const { error: updateFollowerError } = await supabase
          .from("line_followers")
          .update({
            is_active: false,
            unfollowed_at: new Date(timestamp).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("site_id", siteId)
          .eq("line_user_id", lineUserId);

        if (updateFollowerError) {
          console.error(`[LineWebhook] Error deactivating follower:`, updateFollowerError);
        } else {
          console.log(`[LineWebhook] Deactivated LINE follower: ${lineUserId}`);
        }
      }

      // メッセージ受信イベント（必要に応じて実装）
      if (event.type === "message") {
        const lineUserId = event.source.userId;
        const messageType = event.message.type;

        console.log(
          `[LineWebhook] Message event received: lineUserId=${lineUserId}, type=${messageType}`
        );

        // テキストメッセージの場合、特定のコマンドに応答するなど
        if (messageType === "text") {
          const messageText = event.message.text;
          console.log(`[LineWebhook] Text message: ${messageText}`);

          // 必要に応じて自動応答を実装
          // 例: "登録"というメッセージで親御さんとLINEアカウントを紐づけるなど
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    console.error(`[LineWebhook] Error:`, errorMessage);
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}




