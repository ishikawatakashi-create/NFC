import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// 親御さんと生徒の紐づけ削除
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const { id, studentId } = await params;
    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }

    // サービスロールキーを使用してRLSをバイパス
    const supabase = getSupabaseAdmin();

    // 親御さんが存在するか確認
    const { data: parentData, error: parentError } = await supabase
      .from("parents")
      .select("id")
      .eq("id", id)
      .eq("site_id", siteId)
      .single();

    if (parentError || !parentData) {
      return NextResponse.json({ ok: false, error: "親御さんが見つかりません" }, { status: 404 });
    }

    // 紐づけを削除
    const { error } = await supabase
      .from("parent_students")
      .delete()
      .eq("parent_id", id)
      .eq("student_id", studentId);

    if (error) {
      const errorMessage = error.message || String(error);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "紐づけを削除しました" });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}




