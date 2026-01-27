/**
 * LINE紐づけ処理の共通ユーティリティ
 * テキストメッセージとpostbackイベントの両方で使用
 */

import crypto from "crypto";
import { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * 紐づけ用トークンを生成してURLを返す
 */
export async function generateLinkToken(
  supabase: SupabaseClient,
  siteId: string,
  lineUserId: string
): Promise<{ token: string; linkUrl: string } | null> {
  // 一時トークンを生成
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1時間有効

  // トークンをデータベースに保存
  const { error: tokenError } = await supabase.from("line_link_tokens").insert({
    site_id: siteId,
    line_user_id: lineUserId,
    token: token,
    expires_at: expiresAt.toISOString(),
  });

  if (tokenError) {
    console.error(`[LineLinkUtils] Failed to create link token:`, tokenError);
    return null;
  }

  // URLを生成
  let baseUrl = env.NEXT_PUBLIC_BASE_URL;

  // NEXT_PUBLIC_BASE_URLが設定されていない場合、VERCEL_URLから本番URLを推測
  if (!baseUrl && env.VERCEL_URL) {
    const vercelUrl = env.VERCEL_URL;
    if (vercelUrl.includes("-") && vercelUrl.includes(".vercel.app")) {
      console.warn(
        `[LineLinkUtils] Using preview URL: ${vercelUrl}. Please set NEXT_PUBLIC_BASE_URL to production URL.`
      );
    }
    baseUrl = `https://${vercelUrl}`;
  }

  if (!baseUrl) {
    console.error("[LineLinkUtils] NEXT_PUBLIC_BASE_URL is not set. Cannot generate URLs.");
    baseUrl = "http://localhost:3001";
  }

  const linkUrl = `${baseUrl}/link-card?token=${token}`;

  return { token, linkUrl };
}

/**
 * 紐づけ用メッセージを送信
 */
export async function sendLinkMessage(
  lineChannelAccessToken: string,
  replyToken: string,
  linkUrl: string
): Promise<boolean> {
  try {
    const replyBody = {
      replyToken: replyToken,
      messages: [
        {
          type: "text",
          text: `カード紐づけを開始します。\n\n以下のURLにアクセスして、紐づけを完了してください。\n\n${linkUrl}\n\n※このURLは1時間有効です。`,
        },
      ],
    };

    const response = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lineChannelAccessToken}`,
      },
      body: JSON.stringify(replyBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[LineLinkUtils] Failed to send link message:`, response.status, errorText);
      return false;
    }

    console.log(`[LineLinkUtils] Successfully sent link message`);
    return true;
  } catch (error: any) {
    console.error(`[LineLinkUtils] Error sending link message:`, error);
    return false;
  }
}
