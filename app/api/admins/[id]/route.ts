import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// 管理ユーザー更新
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { firstName, lastName, employmentType } = body as {
      firstName?: string;
      lastName?: string;
      employmentType?: "part_time" | "full_time";
    };

    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }

    if (!firstName || !lastName || !employmentType) {
      return NextResponse.json(
        { ok: false, error: "すべての項目を入力してください" },
        { status: 400 }
      );
    }

    if (!["part_time", "full_time"].includes(employmentType)) {
      return NextResponse.json(
        { ok: false, error: "雇用形態が不正です" },
        { status: 400 }
      );
    }

    // サービスロールキーを使用してRLSをバイパス
    const supabase = getSupabaseAdmin();

    // 管理ユーザーを更新
    const { data, error } = await supabase
      .from("admins")
      .update({
        first_name: firstName,
        last_name: lastName,
        employment_type: employmentType,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("site_id", siteId)
      .select()
      .single();

    if (error) {
      const errorMessage = error.message || String(error);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: "管理ユーザーが見つかりませんでした" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      admin: {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        employmentType: data.employment_type,
      },
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

// 管理ユーザー削除
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }

    // サービスロールキーを使用してRLSをバイパス
    const supabase = getSupabaseAdmin();

    // 削除前にauth_user_idを取得
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

    // adminsテーブルから削除（CASCADEでauth.usersも削除される設定の場合）
    // ただし、auth.usersは手動で削除する必要がある場合がある
    const { error: deleteError } = await supabase
      .from("admins")
      .delete()
      .eq("id", id)
      .eq("site_id", siteId);

    if (deleteError) {
      const errorMessage = deleteError.message || String(deleteError);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    // auth.usersからも削除（オプション：CASCADEが設定されていない場合）
    try {
      await supabase.auth.admin.deleteUser(adminData.auth_user_id);
    } catch (authError) {
      // auth.usersの削除に失敗しても、adminsテーブルからの削除は成功しているので警告のみ
      console.warn("Failed to delete auth user:", authError);
    }

    return NextResponse.json({
      ok: true,
      message: "管理ユーザーが正常に削除されました",
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
