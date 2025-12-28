import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/cards/verify
 * NFCカードから読み取ったトークンを検証し、紐付けられた生徒情報を返す
 * 
 * リクエスト: { token: string }
 * レスポンス: { ok: true, student: {...}, cardTokenId: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token } = body as { token?: string };

    // バリデーション
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "token は必須です" },
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

    // 1. トークンを検索（有効なもののみ）
    const { data: cardToken, error: tokenError } = await supabase
      .from("card_tokens")
      .select("id, token, is_active")
      .eq("token", token)
      .eq("site_id", siteId)
      .eq("is_active", true)
      .single();

    if (tokenError || !cardToken) {
      return NextResponse.json(
        { ok: false, error: "無効なカードまたは登録されていないカードです" },
        { status: 404 }
      );
    }

    // 2. 生徒との紐付けを検索
    const { data: studentCard, error: linkError } = await supabase
      .from("student_cards")
      .select("student_id")
      .eq("card_token_id", cardToken.id)
      .single();

    if (linkError || !studentCard) {
      return NextResponse.json(
        { ok: false, error: "このカードに紐付けられた生徒が見つかりません" },
        { status: 404 }
      );
    }

    // 3. 生徒情報を取得
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, name, grade, status, class, role")
      .eq("id", studentCard.student_id)
      .eq("site_id", siteId)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { ok: false, error: "生徒情報の取得に失敗しました" },
        { status: 500 }
      );
    }

    // 4. ステータスチェック（在籍中のみ許可）
    if (student.status !== "active") {
      return NextResponse.json(
        {
          ok: false,
          error: `${student.name}さんは現在${getStatusLabel(student.status)}です`,
          student: {
            id: String(student.id),
            name: student.name,
            status: student.status,
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      student: {
        id: String(student.id),
        name: student.name,
        grade: student.grade,
        status: student.status,
        class: student.class,
        role: student.role,
      },
      cardTokenId: cardToken.id,
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "active":
      return "在籍中";
    case "suspended":
      return "休会中";
    case "withdrawn":
      return "退会済み";
    case "graduated":
      return "卒業済み";
    default:
      return "不明";
  }
}




