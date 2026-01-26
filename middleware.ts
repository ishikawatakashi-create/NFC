import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // パス名をヘッダーに追加（layout.tsxで使用）
  const pathname = request.nextUrl.pathname;
  response.headers.set("x-pathname", pathname);

  // 管理画面の認証チェック（ログインページ、登録ページ、パスワードリセットページを除く）
  const isPublicAdminPage = 
    pathname.startsWith("/admin/login") || 
    pathname.startsWith("/admin/register") ||
    pathname.startsWith("/admin/reset-password");
  const isAuthCallback = pathname.startsWith("/auth/callback");
  const isAdminPage = pathname.startsWith("/admin") && !isPublicAdminPage;
  
  // 認証コールバックは認証チェックをスキップ
  if (isAuthCallback) {
    return response;
  }

  // 管理画面の認証チェック
  if (isAdminPage) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options: any }>) {
            cookiesToSet.forEach(({ name, value, options }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // 管理者情報を確認
    const siteId = process.env.SITE_ID;
    if (siteId) {
      const { data: admin, error: adminError } = await supabase
        .from("admins")
        .select("id")
        .eq("auth_user_id", user.id)
        .eq("site_id", siteId)
        .maybeSingle();

      if (adminError) {
        console.error("[Middleware] Error checking admin:", adminError);
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }

      if (!admin) {
        console.log("[Middleware] Admin not found for user:", user.id);
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

