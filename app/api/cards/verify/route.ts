import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function requireKioskSecret(req: Request): { ok: true } | { ok: false; response: NextResponse } {
  const secret = process.env.KIOSK_API_SECRET;
  
  // 開発環境では、KIOSK_API_SECRETが設定されていない場合は認証をスキップ
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (!secret && isDevelopment) {
    console.warn('[KioskAuth] KIOSK_API_SECRET が設定されていません。開発環境のため認証をスキップします。');
    return { ok: true };
  }
  
  // 本番環境では、KIOSK_API_SECRETが必須
  if (!secret) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "KIOSK_API_SECRET が設定されていません" },
        { status: 500 }
      ),
    };
  }

  const provided = req.headers.get("x-kiosk-secret");
  
  // デバッグログ（本番環境では削除推奨）
  console.log('[KioskAuth] Secret check:', {
    hasSecret: !!secret,
    secretLength: secret?.length,
    provided: provided ? `${provided.substring(0, 10)}...` : 'null',
    providedLength: provided?.length,
    match: provided === secret,
  });
  
  if (!provided || provided !== secret) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "認証に失敗しました" },
        { status: 401 }
      ),
    };
  }

  return { ok: true };
}

/**
 * POST /api/cards/verify
 * NFCカードから読み取ったシリアル番号を検証し、紐付けられた生徒情報を返す
 * 
 * リクエスト: { serialNumber: string } または { token: string } (後方互換性)
 * レスポンス: { ok: true, student: {...} }
 */
export async function POST(req: Request) {
  try {
    const kioskAuth = requireKioskSecret(req);
    if (!kioskAuth.ok) {
      return kioskAuth.response;
    }

    const body = await req.json();
    const { serialNumber, token } = body as { serialNumber?: string; token?: string };

    // バリデーション（シリアル番号またはトークンのいずれかが必要）
    if (!serialNumber && !token) {
      return NextResponse.json(
        { ok: false, error: "serialNumber または token は必須です" },
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

    let studentId: number | null = null;

    // シリアル番号ベースの認証（優先）
    if (serialNumber) {
      // シリアル番号の正規化（小文字に統一、前後の空白を削除）
      const normalizedSerial = serialNumber.trim().toLowerCase();
      
      // 1. シリアル番号から生徒を直接検索（正規化後の値で検索）
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id, name, grade, status, class, role, card_id")
        .eq("card_id", normalizedSerial)
        .eq("site_id", siteId)
        .single();

      if (studentError || !student) {
        return NextResponse.json(
          { ok: false, error: "このカードは登録されていません" },
          { status: 404 }
        );
      }

      // 2. ステータスチェック（在籍中のみ許可）
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
      });
    }

    // トークンベースの認証（後方互換性のため残す）
    if (token) {
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
    }

    return NextResponse.json(
      { ok: false, error: "認証に失敗しました" },
      { status: 400 }
    );
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



