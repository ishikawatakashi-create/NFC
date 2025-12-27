import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/admin/register
 * 管理者を新規登録する（初回セットアップ用）
 * 
 * リクエスト: {
 *   email: string,
 *   password: string,
 *   firstName: string,
 *   lastName: string,
 *   employmentType: "part_time" | "full_time"
 * }
 * レスポンス: { ok: true, adminId: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, firstName, lastName, employmentType } = body as {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      employmentType?: "part_time" | "full_time";
    };

    // バリデーション
    if (!email || !password || !firstName || !lastName || !employmentType) {
      return NextResponse.json(
        { ok: false, error: "すべての項目を入力してください" },
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

    if (!["part_time", "full_time"].includes(employmentType)) {
      return NextResponse.json(
        { ok: false, error: "雇用形態が不正です" },
        { status: 400 }
      );
    }

    const siteId = process.env.SITE_ID;
    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が設定されていません" },
        { status: 500 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. Supabase Authでユーザーを作成
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // メール確認をスキップ（管理者登録なので）
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { ok: false, error: `ユーザー作成に失敗しました: ${authError?.message}` },
        { status: 500 }
      );
    }

    // 2. 管理者情報をadminsテーブルに登録
    const { data: adminData, error: adminError } = await supabase
      .from("admins")
      .insert({
        auth_user_id: authData.user.id,
        site_id: siteId,
        first_name: firstName,
        last_name: lastName,
        employment_type: employmentType,
      })
      .select("id")
      .single();

    if (adminError || !adminData) {
      // ロールバック: 作成したAuthユーザーを削除
      await supabase.auth.admin.deleteUser(authData.user.id);

      return NextResponse.json(
        { ok: false, error: `管理者登録に失敗しました: ${adminError?.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      adminId: adminData.id,
      message: "管理者が正常に登録されました",
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

