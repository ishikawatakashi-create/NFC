import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { env } from "@/lib/env";
import {
  saveOrUpdateLineFollower,
  reactivateParentLineAccount,
} from "@/lib/line-webhook-utils";

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

              // 紐づけ開始コマンド（「紐づけ」「登録」「設定」など）
              const linkCommands = ["紐づけ", "紐付け", "登録", "設定", "カード登録", "通知登録"];
              const normalizedMessage = messageText.trim();
              
              console.log(`[LineWebhook] Normalized message: "${normalizedMessage}"`);
              console.log(`[LineWebhook] Checking against commands:`, linkCommands);
              
              const isLinkCommand = linkCommands.some(cmd => normalizedMessage.includes(cmd));
              console.log(`[LineWebhook] Is link command: ${isLinkCommand}`);
              
              if (isLinkCommand) {
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
                  console.error(`[LineWebhook] Token error details:`, JSON.stringify(tokenError, null, 2));
                } else {
                  console.log(`[LineWebhook] Token created successfully: ${token.substring(0, 10)}...`);
                  
                  // URLを生成（本番環境のURLを環境変数から取得）
                  // VERCEL_URLはプレビュー環境のURLになる可能性があるため、NEXT_PUBLIC_BASE_URLを優先
                  // プレビュー環境のURL（-xxx-xxx.vercel.app）は認証が必要な場合があるため、本番URLを使用
                  let baseUrl = env.NEXT_PUBLIC_BASE_URL;
                  
                  // NEXT_PUBLIC_BASE_URLが設定されていない場合、VERCEL_URLから本番URLを推測
                  if (!baseUrl && env.VERCEL_URL) {
                    // プレビュー環境のURL（例: xxx-xxx-xxx.vercel.app）を本番URLに変換
                    // プロジェクト名から本番URLを推測（実際の本番URLに置き換える必要がある）
                    const vercelUrl = env.VERCEL_URL;
                    // プレビュー環境のURLの場合は警告を出す
                    if (vercelUrl.includes('-') && vercelUrl.includes('.vercel.app')) {
                      console.warn(`[LineWebhook] Using preview URL: ${vercelUrl}. Please set NEXT_PUBLIC_BASE_URL to production URL.`);
                    }
                    baseUrl = `https://${vercelUrl}`;
                  }
                  
                  if (!baseUrl) {
                    console.error("[LineWebhook] NEXT_PUBLIC_BASE_URL is not set. Cannot generate URLs.");
                    // エラーを返さず、デフォルトURLを使用（開発環境用）
                    baseUrl = "http://localhost:3001";
                  }
                  
                  const linkUrl = `${baseUrl}/link-card?token=${token}`;
                  
                  // QRコード画像のURLを生成
                  // LINE Messaging APIのImage Messageには、HTTPSで公開アクセス可能なURLが必要
                  const qrCodeUrl = `${baseUrl}/api/line/qr-code?url=${encodeURIComponent(linkUrl)}`;
                  
                  console.log(`[LineWebhook] Generated link URL: ${linkUrl}`);
                  console.log(`[LineWebhook] QR code URL: ${qrCodeUrl}`);
                  console.log(`[LineWebhook] Base URL: ${baseUrl}`);
                  
                  // LINEメッセージを送信
                  const lineChannelAccessToken = env.LINE_CHANNEL_ACCESS_TOKEN;
                  if (!lineChannelAccessToken) {
                    console.error("[LineWebhook] LINE_CHANNEL_ACCESS_TOKEN is not set");
                  } else {
                    console.log(`[LineWebhook] Sending reply message...`);
                    console.log(`[LineWebhook] Reply token: ${event.replyToken}`);
                    console.log(`[LineWebhook] Access token length: ${lineChannelAccessToken.length}`);
                    
                    try {
                      // LINE Messaging APIのImage Messageには、HTTPSで公開アクセス可能なURLが必要
                      // プレビュー環境のURLは認証が必要な場合があるため、本番URLを使用する必要がある
                      // QRコード画像のURLが正しく生成されているか確認
                      console.log(`[LineWebhook] QR code image URL: ${qrCodeUrl}`);
                      console.log(`[LineWebhook] QR code URL is HTTPS: ${qrCodeUrl.startsWith('https://')}`);
                      
                      const replyBody = {
                        replyToken: event.replyToken,
                        messages: [
                          {
                            type: "text",
                            text: `カード紐づけを開始します。\n\n以下のQRコードを読み取るか、URLにアクセスして、お子様のNFCカードをタッチしてください。\n\n${linkUrl}\n\n※このURLは1時間有効です。`,
                          },
                          {
                            type: "image",
                            originalContentUrl: qrCodeUrl,
                            previewImageUrl: qrCodeUrl,
                          },
                        ],
                      };
                      
                      console.log(`[LineWebhook] Reply body:`, JSON.stringify(replyBody, null, 2));
                      
                      const response = await fetch("https://api.line.me/v2/bot/message/reply", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${lineChannelAccessToken}`,
                        },
                        body: JSON.stringify(replyBody),
                      });
                      
                      console.log(`[LineWebhook] Reply API response status: ${response.status}`);
                      
                      if (!response.ok) {
                        const errorText = await response.text();
                        console.error(`[LineWebhook] Failed to send reply message:`, response.status, errorText);
                        try {
                          const errorJson = JSON.parse(errorText);
                          console.error(`[LineWebhook] Error details:`, JSON.stringify(errorJson, null, 2));
                        } catch {
                          console.error(`[LineWebhook] Error text (not JSON):`, errorText);
                        }
                      } else {
                        const responseText = await response.text();
                        console.log(`[LineWebhook] Successfully sent link URL to ${lineUserId}`);
                        console.log(`[LineWebhook] Response:`, responseText);
                      }
                    } catch (fetchError: any) {
                      console.error(`[LineWebhook] Error sending reply message:`, fetchError);
                      console.error(`[LineWebhook] Error stack:`, fetchError.stack);
                    }
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



