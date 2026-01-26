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
  try {
    const channelSecret = env.LINE_CHANNEL_SECRET;
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

    const siteId = env.SITE_ID;
    const supabase = getSupabaseAdmin();

    // 各イベントを処理
    for (const event of events) {
      // 友だち追加イベント
      if (event.type === "follow") {
        const lineUserId = event.source.userId;
        const timestamp = event.timestamp;

        console.log(`[LineWebhook] Follow event received: lineUserId=${lineUserId}`);

        // parent_line_accountsのアカウントをアクティブ化
        await reactivateParentLineAccount(supabase, lineUserId, timestamp);

        // LINE友だち情報を保存または更新
        await saveOrUpdateLineFollower(supabase, siteId, lineUserId, timestamp, "follow");
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

        // parent_line_accountsのアカウントをアクティブ化
        await reactivateParentLineAccount(supabase, lineUserId, timestamp);

        // LINE友だち情報を保存または更新
        await saveOrUpdateLineFollower(supabase, siteId, lineUserId, timestamp, "message");

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
              const baseUrl = env.NEXT_PUBLIC_BASE_URL || env.VERCEL_URL 
                ? `https://${env.VERCEL_URL}` 
                : "http://localhost:3000";
              const linkUrl = `${baseUrl}/link-card?token=${token}`;
              
              // LINEメッセージを送信
              const lineChannelAccessToken = env.LINE_CHANNEL_ACCESS_TOKEN;
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



