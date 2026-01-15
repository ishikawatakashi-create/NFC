import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

/**
 * 認証コールバックルート
 * パスワードリセットなどの認証フローで使用されるコールバックURL
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/admin/reset-password";

  if (!code) {
    return NextResponse.redirect(
      new URL(`/admin/login?error=${encodeURIComponent("認証コードがありません")}`, request.url)
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  // コードをセッションに交換
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[Auth Callback] Exchange error:", error);
    return NextResponse.redirect(
      new URL(
        `/admin/login?error=${encodeURIComponent(error.message || "認証に失敗しました")}`,
        request.url
      )
    );
  }

  // 成功したら指定されたページにリダイレクト
  return NextResponse.redirect(new URL(next, request.url));
}
