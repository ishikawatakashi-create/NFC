import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// 管理ユーザーのパスワード更新
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { password } = body as {
      password?: string;
    };

    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { ok: false, error: "パスワードを入力してください" },
        { status: 400 }
      );
    }

    // パスワード要件チェック
    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "パスワードは8文字以上である必要があります" },
        { status: 400 }
      );
    }
    if (!/[a-z]/.test(password)) {
      return NextResponse.json(
        { ok: false, error: "パスワードに小文字を含める必要があります" },
        { status: 400 }
      );
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { ok: false, error: "パスワードに大文字を含める必要があります" },
        { status: 400 }
      );
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json(
        { ok: false, error: "パスワードに数字を含める必要があります" },
        { status: 400 }
      );
    }

    // サービスロールキーを使用してRLSをバイパス
    const supabase = getSupabaseAdmin();

    // 管理ユーザーのauth_user_idを取得
    const { data: adminData, error: fetchError } = await supabase
      .from("admins")
      .select("auth_user_id")
      .eq("id", id)
      .eq("site_id", siteId)
      .single();

    if (fetchError || !adminData) {
      return NextResponse.json(
        { ok: false, error: "管理ユーザーが見つかりませんでした" },
        { status: 404 }
      );
    }

    // Supabase Authでパスワードを更新
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      adminData.auth_user_id,
      {
        password: password,
      }
    );

    if (updateError) {
      const errorMessage = updateError.message || String(updateError);
      return NextResponse.json(
        { ok: false, error: `パスワードの更新に失敗しました: ${errorMessage}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "パスワードが正常に更新されました",
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
