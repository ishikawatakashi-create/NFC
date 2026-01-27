import { NextResponse } from "next/server";
import { env } from "@/lib/env";

/**
 * LINEリッチメニュー管理API
 * 
 * GET: 現在設定されているリッチメニューを取得
 * POST: リッチメニューを作成・設定
 * DELETE: リッチメニューを削除
 */

/**
 * リッチメニューの定義を生成
 * シンプルな2ボタンレイアウト
 */
function getRichMenuDefinition() {
  // 環境変数から公式アカウントURLを取得（オプション）
  const officialAccountUrl =
    process.env.NEXT_PUBLIC_LINE_OFFICIAL_ACCOUNT_URL ||
    "https://line.me/R/ti/p/@your-official-account-id";

  return {
    size: {
      width: 2500,
      height: 1686,
    },
    selected: false,
    name: "NFCカード紐づけメニュー",
    chatBarText: "メニュー",
    areas: [
      {
        bounds: {
          x: 0,
          y: 0,
          width: 1250,
          height: 1686,
        },
        action: {
          type: "postback",
          label: "カード紐づけ",
          data: "link_card",
          displayText: "カード紐づけを開始します",
        },
      },
      {
        bounds: {
          x: 1250,
          y: 0,
          width: 1250,
          height: 1686,
        },
        action: {
          type: "uri",
          label: "公式アカウントについて",
          uri: officialAccountUrl,
        },
      },
    ],
  };
}

/**
 * GET: 現在設定されているリッチメニューを取得
 */
export async function GET() {
  try {
    const lineChannelAccessToken = env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!lineChannelAccessToken) {
      return NextResponse.json(
        { ok: false, error: "LINE_CHANNEL_ACCESS_TOKEN が設定されていません" },
        { status: 500 }
      );
    }

    // 全ユーザーに設定されているリッチメニューIDを取得
    const response = await fetch("https://api.line.me/v2/bot/user/all/richmenu", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${lineChannelAccessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { ok: false, error: `リッチメニュー取得に失敗: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    console.error("[RichMenu] Error getting rich menu:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "リッチメニュー取得に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * POST: リッチメニューを作成・設定
 * 
 * リクエストボディ:
 * - imageUrl: リッチメニュー画像のURL（HTTPSで公開アクセス可能なURL）
 * 
 * 注意: 画像は2500x1686ピクセル、PNGまたはJPEG形式である必要があります
 */
export async function POST(req: Request) {
  try {
    const lineChannelAccessToken = env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!lineChannelAccessToken) {
      return NextResponse.json(
        { ok: false, error: "LINE_CHANNEL_ACCESS_TOKEN が設定されていません" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { ok: false, error: "imageUrl が必要です" },
        { status: 400 }
      );
    }

    // 1. リッチメニューオブジェクトを作成
    console.log("[RichMenu] Creating rich menu object...");
    const createResponse = await fetch("https://api.line.me/v2/bot/richmenu", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lineChannelAccessToken}`,
      },
      body: JSON.stringify(getRichMenuDefinition()),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error("[RichMenu] Failed to create rich menu:", errorText);
      return NextResponse.json(
        { ok: false, error: `リッチメニュー作成に失敗: ${createResponse.status} ${errorText}` },
        { status: createResponse.status }
      );
    }

    const richMenuData = await createResponse.json();
    const richMenuId = richMenuData.richMenuId;
    console.log(`[RichMenu] Rich menu created: ${richMenuId}`);

    // 2. リッチメニュー画像をアップロード
    console.log("[RichMenu] Uploading rich menu image...");
    
    // 画像URLから画像データを取得
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { ok: false, error: `画像の取得に失敗: ${imageResponse.status}` },
        { status: imageResponse.status }
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get("content-type") || "image/png";

    const uploadResponse = await fetch(
      `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
      {
        method: "POST",
        headers: {
          "Content-Type": contentType,
          Authorization: `Bearer ${lineChannelAccessToken}`,
        },
        body: imageBuffer,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("[RichMenu] Failed to upload image:", errorText);
      
      // 作成したリッチメニューを削除
      await fetch(`https://api.line.me/v2/bot/richmenu/${richMenuId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${lineChannelAccessToken}`,
        },
      });

      return NextResponse.json(
        { ok: false, error: `画像のアップロードに失敗: ${uploadResponse.status} ${errorText}` },
        { status: uploadResponse.status }
      );
    }

    console.log("[RichMenu] Image uploaded successfully");

    // 3. 全ユーザーにリッチメニューを設定
    console.log("[RichMenu] Setting rich menu for all users...");
    const setResponse = await fetch(
      `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lineChannelAccessToken}`,
        },
      }
    );

    if (!setResponse.ok) {
      const errorText = await setResponse.text();
      console.error("[RichMenu] Failed to set rich menu:", errorText);
      return NextResponse.json(
        { ok: false, error: `リッチメニュー設定に失敗: ${setResponse.status} ${errorText}` },
        { status: setResponse.status }
      );
    }

    console.log("[RichMenu] Rich menu set successfully");

    return NextResponse.json({
      ok: true,
      message: "リッチメニューを作成・設定しました",
      richMenuId,
    });
  } catch (error: any) {
    console.error("[RichMenu] Error creating rich menu:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "リッチメニュー作成に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: リッチメニューを削除
 */
export async function DELETE(req: Request) {
  try {
    const lineChannelAccessToken = env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!lineChannelAccessToken) {
      return NextResponse.json(
        { ok: false, error: "LINE_CHANNEL_ACCESS_TOKEN が設定されていません" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const richMenuId = searchParams.get("richMenuId");

    if (!richMenuId) {
      return NextResponse.json(
        { ok: false, error: "richMenuId が必要です" },
        { status: 400 }
      );
    }

    // 1. 全ユーザーからリッチメニューを解除
    console.log("[RichMenu] Canceling rich menu for all users...");
    const cancelResponse = await fetch(
      `https://api.line.me/v2/bot/user/all/richmenu`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${lineChannelAccessToken}`,
        },
      }
    );

    if (!cancelResponse.ok && cancelResponse.status !== 404) {
      const errorText = await cancelResponse.text();
      console.error("[RichMenu] Failed to cancel rich menu:", errorText);
    }

    // 2. リッチメニューを削除
    console.log(`[RichMenu] Deleting rich menu: ${richMenuId}...`);
    const deleteResponse = await fetch(
      `https://api.line.me/v2/bot/richmenu/${richMenuId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${lineChannelAccessToken}`,
        },
      }
    );

    if (!deleteResponse.ok && deleteResponse.status !== 404) {
      const errorText = await deleteResponse.text();
      console.error("[RichMenu] Failed to delete rich menu:", errorText);
      return NextResponse.json(
        { ok: false, error: `リッチメニュー削除に失敗: ${deleteResponse.status} ${errorText}` },
        { status: deleteResponse.status }
      );
    }

    console.log("[RichMenu] Rich menu deleted successfully");

    return NextResponse.json({
      ok: true,
      message: "リッチメニューを削除しました",
    });
  } catch (error: any) {
    console.error("[RichMenu] Error deleting rich menu:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "リッチメニュー削除に失敗しました" },
      { status: 500 }
    );
  }
}
