import { NextResponse } from "next/server";

/**
 * LINE公式アカウントの友だち一覧を取得
 * LINE Messaging APIの /v2/bot/followers/ids エンドポイントを使用
 */
export async function GET(req: Request) {
  try {
    const lineChannelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!lineChannelAccessToken) {
      return NextResponse.json(
        { ok: false, error: "LINE_CHANNEL_ACCESS_TOKEN が設定されていません" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "1000", 10); // デフォルト1000件
    const start = searchParams.get("start") || undefined; // ページネーション用

    // 友だち一覧（User IDのみ）を取得
    const followersUrl = new URL("https://api.line.me/v2/bot/followers/ids");
    if (limit) {
      followersUrl.searchParams.set("limit", limit.toString());
    }
    if (start) {
      followersUrl.searchParams.set("start", start);
    }

    const followersResponse = await fetch(followersUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${lineChannelAccessToken}`,
      },
    });

    if (!followersResponse.ok) {
      const errorData = await followersResponse.json().catch(() => ({}));
      const errorMessage =
        errorData.message || `LINE API error: ${followersResponse.status} ${followersResponse.statusText}`;
      console.error(`[LineFollowers] Failed to get followers:`, errorMessage);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    const followersData = await followersResponse.json();
    const userIds: string[] = followersData.userIds || [];
    const next: string | undefined = followersData.next;

    // 各User IDに対してプロフィール情報を取得（表示名を取得するため）
    const followersWithProfile = await Promise.all(
      userIds.map(async (userId) => {
        try {
          const profileResponse = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${lineChannelAccessToken}`,
            },
          });

          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            return {
              userId,
              displayName: profileData.displayName || userId,
              pictureUrl: profileData.pictureUrl || null,
            };
          } else {
            // プロフィール取得に失敗した場合でも、User IDだけ返す
            return {
              userId,
              displayName: userId,
              pictureUrl: null,
            };
          }
        } catch (error) {
          console.error(`[LineFollowers] Failed to get profile for ${userId}:`, error);
          return {
            userId,
            displayName: userId,
            pictureUrl: null,
          };
        }
      })
    );

    return NextResponse.json({
      ok: true,
      followers: followersWithProfile,
      next: next || null,
      count: followersWithProfile.length,
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    console.error(`[LineFollowers] Error:`, errorMessage);
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

