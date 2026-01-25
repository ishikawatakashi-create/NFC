import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * LINE Webhookエンドポイント
 * LINE公式アカウントと友だちになった際や、メッセージを受信した際に呼び出される
 */
export async function POST(req: Request) {
  try {
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    if (!channelSecret) {
      return NextResponse.json(
        { ok: false, error: "LINE_CHANNEL_SECRET が設定されていません" },
        { status: 500 }
      );
    }

    const signature = req.headers.get("x-line-signature");
    const rawBody = await req.text();
    if (!signature) {
      return NextResponse.json(
        { ok: false, error: "署名がありません" },
        { status: 401 }
      );
    }

    const expectedSignature = crypto
      .createHmac("sha256", channelSecret)
      .update(rawBody)
      .digest("base64");

    if (signature !== expectedSignature) {
      return NextResponse.json(
        { ok: false, error: "署名検証に失敗しました" },
        { status: 401 }
      );
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { ok: false, error: "無効なリクエストです" },
        { status: 400 }
      );
    }
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

      // メッセージ受信イベント
      if (event.type === "message") {
        const lineUserId = event.source.userId;
        const messageType = event.message.type;
        const timestamp = event.timestamp;

        console.log(
          `[LineWebhook] Message event received: lineUserId=${lineUserId}, type=${messageType}`
        );

        // 既存のLINEアカウント情報を確認
        const { data: existingAccount, error: checkError } = await supabase
          .from("parent_line_accounts")
          .select("id, parent_id, is_active")
          .eq("line_user_id", lineUserId)
          .single();

        if (checkError && checkError.code !== "PGRST116") {
          // PGRST116は「レコードが見つからない」エラーなので無視
          console.error(`[LineWebhook] Error checking existing account:`, checkError);
        } else if (existingAccount) {
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
              `[LineWebhook] Reactivated LINE account for parent ${existingAccount.parent_id} via message`
            );
          }
        }

        // LINE友だち情報を取得して保存（メッセージ受信時にも取得可能にする）
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
              // 既存の友だちをアクティブ化（メッセージ受信時にも更新）
              const { error: updateFollowerError } = await supabase
                .from("line_followers")
                .update({
                  is_active: true,
                  unfollowed_at: null,
                  line_display_name: displayName,
                  picture_url: pictureUrl,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingFollower.id);

              if (updateFollowerError) {
                console.error(`[LineWebhook] Error updating follower:`, updateFollowerError);
              } else {
                console.log(`[LineWebhook] Updated LINE follower via message: ${lineUserId}`);
              }
            } else {
              // 新規友だちを保存（メッセージ受信時にも保存可能）
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
                console.log(`[LineWebhook] Saved new LINE follower via message: ${lineUserId}`);
              }
            }
          }
        } catch (profileError) {
          console.error(`[LineWebhook] Error fetching/saving profile:`, profileError);
        }

        // テキストメッセージの場合、特定のコマンドに応答するなど
        if (messageType === "text") {
          const messageText = event.message.text;
          console.log(`[LineWebhook] Text message: ${messageText}`);

          // 紐づけ開始コマンド（「紐づけ」「登録」「設定」など）
          const linkCommands = ["紐づけ", "紐付け", "登録", "設定", "カード登録", "通知登録"];
          const normalizedMessage = messageText.trim();
          
          if (linkCommands.some(cmd => normalizedMessage.includes(cmd))) {
            console.log(`[LineWebhook] Link command detected: ${normalizedMessage}`);
            
            // 一時トークンを生成
            const token = crypto.randomBytes(32).toString("hex");
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1); // 1時間有効
            
            // トークンをデータベースに保存
            const { error: tokenError } = await supabase
              .from("line_link_tokens")
              .insert({
                site_id: siteId,
                line_user_id: lineUserId,
                token: token,
                expires_at: expiresAt.toISOString(),
              });
            
            if (tokenError) {
              console.error(`[LineWebhook] Failed to create link token:`, tokenError);
            } else {
              // URLを生成（本番環境のURLを環境変数から取得、なければデフォルト）
              const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL 
                ? `https://${process.env.VERCEL_URL}` 
                : "http://localhost:3000";
              const linkUrl = `${baseUrl}/link-card?token=${token}`;
              
              // LINEメッセージを送信
              const lineChannelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
              if (lineChannelAccessToken) {
                const response = await fetch("https://api.line.me/v2/bot/message/reply", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${lineChannelAccessToken}`,
                  },
                  body: JSON.stringify({
                    replyToken: event.replyToken,
                    messages: [
                      {
                        type: "text",
                        text: `カード紐づけを開始します。\n\n以下のURLにアクセスして、お子様のNFCカードをタッチしてください。\n\n${linkUrl}\n\n※このURLは1時間有効です。`,
                      },
                    ],
                  }),
                });
                
                if (!response.ok) {
                  console.error(`[LineWebhook] Failed to send reply message:`, await response.text());
                } else {
                  console.log(`[LineWebhook] Sent link URL to ${lineUserId}`);
                }
              }
            }
          }
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



