import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { env } from "@/lib/env";
import {
  saveOrUpdateLineFollower,
  reactivateParentLineAccount,
} from "@/lib/line-webhook-utils";
import {
  generateLinkToken,
  sendLinkMessage,
} from "@/lib/line-link-utils";

/**
 * LINE Webhookエンドポイント
 * LINE公式アカウントと友だちになった際や、メッセージを受信した際に呼び出される
 */
export async function POST(req: Request) {
  // LINE Webhookは必ず200を返す必要があるため、エラーが発生しても200を返す
  try {
    const channelSecret = env.LINE_CHANNEL_SECRET;
    if (!channelSecret) {
      console.error("[LineWebhook] LINE_CHANNEL_SECRET が設定されていません");
      // LINE Webhookは必ず200を返す必要がある
      return NextResponse.json({ ok: false, error: "LINE_CHANNEL_SECRET が設定されていません" });
    }

    const signature = req.headers.get("x-line-signature");
    const rawBody = await req.text();
    if (!signature) {
      console.error("[LineWebhook] 署名がありません");
      // LINE Webhookは必ず200を返す必要がある
      return NextResponse.json({ ok: false, error: "署名がありません" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", channelSecret)
      .update(rawBody)
      .digest("base64");

    if (signature !== expectedSignature) {
      console.error("[LineWebhook] 署名検証に失敗しました");
      // LINE Webhookは必ず200を返す必要がある
      return NextResponse.json({ ok: false, error: "署名検証に失敗しました" });
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError: any) {
      console.error("[LineWebhook] JSON解析エラー:", parseError);
      // LINE Webhookは必ず200を返す必要がある
      return NextResponse.json({ ok: false, error: "無効なリクエストです" });
    }
    const events = body.events || [];

    const siteId = env.SITE_ID;
    if (!siteId) {
      console.error("[LineWebhook] SITE_ID が設定されていません");
      // LINE Webhookは必ず200を返す必要がある
      return NextResponse.json({ ok: false, error: "SITE_ID が設定されていません" });
    }

    const supabase = getSupabaseAdmin();

    // 各イベントを処理
    for (const event of events) {
      try {
        // 友だち追加イベント
        if (event.type === "follow") {
          const lineUserId = event.source?.userId;
          const timestamp = event.timestamp;

          if (!lineUserId) {
            console.error("[LineWebhook] Follow event: lineUserId is missing");
            continue;
          }

          console.log(`[LineWebhook] Follow event received: lineUserId=${lineUserId}`);

          try {
            // parent_line_accountsのアカウントをアクティブ化
            await reactivateParentLineAccount(supabase, lineUserId, timestamp);
          } catch (error: any) {
            console.error(`[LineWebhook] Error reactivating parent line account:`, error);
          }

          try {
            // LINE友だち情報を保存または更新
            await saveOrUpdateLineFollower(supabase, siteId, lineUserId, timestamp, "follow");
          } catch (error: any) {
            console.error(`[LineWebhook] Error saving line follower:`, error);
          }
        }

        // 友だち解除イベント
        if (event.type === "unfollow") {
          const lineUserId = event.source?.userId;
          const timestamp = event.timestamp;

          if (!lineUserId) {
            console.error("[LineWebhook] Unfollow event: lineUserId is missing");
            continue;
          }

          console.log(`[LineWebhook] Unfollow event received: lineUserId=${lineUserId}`);

          try {
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
          } catch (error: any) {
            console.error(`[LineWebhook] Error in unfollow account update:`, error);
          }

          try {
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
          } catch (error: any) {
            console.error(`[LineWebhook] Error in unfollow follower update:`, error);
          }
        }

        // Postbackイベント（リッチメニューのボタンクリックなど）
        if (event.type === "postback") {
          const lineUserId = event.source?.userId;
          const postbackData = event.postback?.data;

          if (!lineUserId) {
            console.error("[LineWebhook] Postback event: lineUserId is missing");
            continue;
          }

          console.log(
            `[LineWebhook] Postback event received: lineUserId=${lineUserId}, data=${postbackData}`
          );

          try {
            // parent_line_accountsのアカウントをアクティブ化
            await reactivateParentLineAccount(supabase, lineUserId, event.timestamp);
          } catch (error: any) {
            console.error(`[LineWebhook] Error reactivating parent line account:`, error);
          }

          try {
            // LINE友だち情報を保存または更新
            await saveOrUpdateLineFollower(
              supabase,
              siteId,
              lineUserId,
              event.timestamp,
              "postback"
            );
          } catch (error: any) {
            console.error(`[LineWebhook] Error saving line follower:`, error);
          }

          // 紐づけボタンがクリックされた場合
          if (postbackData === "link_card") {
            console.log(`[LineWebhook] Link card postback detected`);
            
            // 共通関数を使用して紐づけ処理
            const linkResult = await generateLinkToken(supabase, siteId, lineUserId);
            
            if (linkResult) {
              const lineChannelAccessToken = env.LINE_CHANNEL_ACCESS_TOKEN;
              if (lineChannelAccessToken) {
                await sendLinkMessage(
                  lineChannelAccessToken,
                  event.replyToken,
                  linkResult.linkUrl
                );
              } else {
                console.error("[LineWebhook] LINE_CHANNEL_ACCESS_TOKEN is not set");
              }
            }
          }
        }

        // メッセージ受信イベント
        if (event.type === "message") {
          const lineUserId = event.source?.userId;
          const messageType = event.message?.type;
          const timestamp = event.timestamp;

          if (!lineUserId) {
            console.error("[LineWebhook] Message event: lineUserId is missing");
            continue;
          }

          console.log(
            `[LineWebhook] Message event received: lineUserId=${lineUserId}, type=${messageType}`
          );

          try {
            // parent_line_accountsのアカウントをアクティブ化
            await reactivateParentLineAccount(supabase, lineUserId, timestamp);
          } catch (error: any) {
            console.error(`[LineWebhook] Error reactivating parent line account:`, error);
          }

          try {
            // LINE友だち情報を保存または更新
            await saveOrUpdateLineFollower(supabase, siteId, lineUserId, timestamp, "message");
          } catch (error: any) {
            console.error(`[LineWebhook] Error saving line follower:`, error);
          }

          // テキストメッセージの場合、特定のコマンドに応答するなど
          if (messageType === "text") {
            try {
              const messageText = event.message?.text;
              if (!messageText) {
                console.error("[LineWebhook] Text message: message text is missing");
                continue;
              }

              console.log(`[LineWebhook] Text message received: "${messageText}"`);
              console.log(`[LineWebhook] Message type: ${messageType}`);
              console.log(`[LineWebhook] Reply token: ${event.replyToken}`);

              // 紐づけ開始コマンド（リッチメニューのフレーズに合わせる）
              const linkCommands = ["カード紐づけを開始します", "カード紐付けを開始します", "カード紐づけ", "カード紐付け"];
              const normalizedMessage = messageText.trim();
              
              console.log(`[LineWebhook] Normalized message: "${normalizedMessage}"`);
              console.log(`[LineWebhook] Checking against commands:`, linkCommands);
              
              const isLinkCommand = linkCommands.some(cmd => normalizedMessage.includes(cmd));
              console.log(`[LineWebhook] Is link command: ${isLinkCommand}`);
              
              if (isLinkCommand) {
                console.log(`[LineWebhook] Link command detected: ${normalizedMessage}`);
                
                // 共通関数を使用して紐づけ処理
                const linkResult = await generateLinkToken(supabase, siteId, lineUserId);
                
                if (linkResult) {
                  const lineChannelAccessToken = env.LINE_CHANNEL_ACCESS_TOKEN;
                  if (lineChannelAccessToken) {
                    await sendLinkMessage(
                      lineChannelAccessToken,
                      event.replyToken,
                      linkResult.linkUrl
                    );
                  } else {
                    console.error("[LineWebhook] LINE_CHANNEL_ACCESS_TOKEN is not set");
                  }
                }
              }
            } catch (messageError: any) {
              console.error(`[LineWebhook] Error processing text message:`, messageError);
            }
          }
        }
      } catch (eventError: any) {
        console.error(`[LineWebhook] Error processing event:`, eventError);
        console.error(`[LineWebhook] Event data:`, JSON.stringify(event, null, 2));
      }
    }

    // LINE Webhookは必ず200を返す必要がある
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    const errorStack = e?.stack || "";
    console.error(`[LineWebhook] Unexpected error:`, errorMessage);
    console.error(`[LineWebhook] Error stack:`, errorStack);
    // LINE Webhookは必ず200を返す必要がある（エラーが発生しても）
    return NextResponse.json({ ok: false, error: errorMessage });
  }
}



