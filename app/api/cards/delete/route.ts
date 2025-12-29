import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * DELETE /api/cards/delete
 * 生徒のカード登録を削除する（student_cardsの削除とcard_tokensの無効化）
 * 
 * リクエスト: { studentId: string }
 * レスポンス: { ok: true }
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    // バリデーション
    if (!studentId) {
      return NextResponse.json(
        { ok: false, error: "studentId は必須です" },
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

    // 1. 生徒がこのサイトに属しているか確認
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, name")
      .eq("id", studentId)
      .eq("site_id", siteId)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { ok: false, error: "指定された生徒が見つからないか、権限がありません" },
        { status: 404 }
      );
    }

    // 2. 既存のカード紐付けを取得
    const { data: existingCards, error: linkError } = await supabase
      .from("student_cards")
      .select("card_token_id")
      .eq("student_id", studentId);

    if (linkError) {
      return NextResponse.json(
        { ok: false, error: `カード紐付けの取得に失敗しました: ${linkError.message}` },
        { status: 500 }
      );
    }

    // 3. カード紐付けが存在する場合、トークンを無効化してから削除
    if (existingCards && existingCards.length > 0) {
      const tokenIds = existingCards.map((c) => c.card_token_id);

      // トークンを無効化
      const { error: disableError } = await supabase
        .from("card_tokens")
        .update({ is_active: false, disabled_at: new Date().toISOString() })
        .in("id", tokenIds)
        .eq("site_id", siteId);

      if (disableError) {
        return NextResponse.json(
          { ok: false, error: `トークン無効化に失敗しました: ${disableError.message}` },
          { status: 500 }
        );
      }

      // カード紐付けを削除
      const { error: deleteError } = await supabase
        .from("student_cards")
        .delete()
        .eq("student_id", studentId);

      if (deleteError) {
        return NextResponse.json(
          { ok: false, error: `カード紐付けの削除に失敗しました: ${deleteError.message}` },
          { status: 500 }
        );
      }
    }

    // studentsテーブルのcard_idもnullに更新（existingCardsが空でも実行）
    const { error: updateError } = await supabase
      .from("students")
      .update({ card_id: null })
      .eq("id", studentId)
      .eq("site_id", siteId);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: `students.card_idの更新に失敗しました: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}




