import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

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
        } else {
          // 新規の友だち追加の場合、LINE User IDを一時的に保存するか、
          // 親御さんが管理画面でLINE User IDを入力して紐づける必要がある
          // ここではログに記録するのみ
          console.log(
            `[LineWebhook] New LINE user followed: ${lineUserId}. Parent needs to be linked manually.`
          );
        }
      }

      // 友だち解除イベント
      if (event.type === "unfollow") {
        const lineUserId = event.source.userId;

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


