import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { randomBytes } from "crypto";

/**
 * POST /api/cards/issue
 * 生徒にNFCカードトークンを発行し、DBに紐付ける
 * 
 * リクエスト: { studentId: string }
 * レスポンス: { ok: true, token: string, cardTokenId: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentId } = body as { studentId?: string };

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

    // 2. 既存のカード紐付けを確認
    const { data: existingCards } = await supabase
      .from("student_cards")
      .select("card_token_id")
      .eq("student_id", studentId);

    // 既存カードがあれば無効化
    if (existingCards && existingCards.length > 0) {
      const tokenIds = existingCards.map((c) => c.card_token_id);
      await supabase
        .from("card_tokens")
        .update({ is_active: false, disabled_at: new Date().toISOString() })
        .in("id", tokenIds);

      // 既存の紐付けを削除
      await supabase
        .from("student_cards")
        .delete()
        .eq("student_id", studentId);
    }

    // 3. 新しいトークンを生成
    const randomSuffix = randomBytes(16).toString("hex"); // 32文字のランダム文字列
    const token = `iru:card:${randomSuffix}`;

    // 4. card_tokens に挿入
    const { data: cardToken, error: tokenError } = await supabase
      .from("card_tokens")
      .insert({
        site_id: siteId,
        token,
        is_active: true,
      })
      .select("id")
      .single();

    if (tokenError || !cardToken) {
      return NextResponse.json(
        { ok: false, error: `トークン発行に失敗しました: ${tokenError?.message}` },
        { status: 500 }
      );
    }

    // 5. student_cards に紐付け
    const { error: linkError } = await supabase
      .from("student_cards")
      .insert({
        student_id: studentId,
        card_token_id: cardToken.id,
      });

    if (linkError) {
      // ロールバック: 発行したトークンを無効化
      await supabase
        .from("card_tokens")
        .update({ is_active: false, disabled_at: new Date().toISOString() })
        .eq("id", cardToken.id);

      return NextResponse.json(
        { ok: false, error: `カード紐付けに失敗しました: ${linkError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      token,
      cardTokenId: cardToken.id,
      studentName: student.name,
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}


