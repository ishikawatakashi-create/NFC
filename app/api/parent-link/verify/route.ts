import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /api/parent-link/verify
 * NFCカードのシリアル番号または生徒IDから親御さん情報を取得する
 * 
 * クエリパラメータ:
 * - cardId: NFCカードのシリアル番号（card_id）
 * - studentId: 生徒ID
 * 
 * レスポンス:
 * - ok: true/false
 * - student: 生徒情報
 * - parents: 親御さん情報の配列
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cardId = searchParams.get("cardId");
    const studentId = searchParams.get("studentId");

    // バリデーション（cardIdまたはstudentIdのいずれかが必要）
    if (!cardId && !studentId) {
      return NextResponse.json(
        { ok: false, error: "cardId または studentId は必須です" },
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

    let student: any = null;

    // 1. 生徒情報を取得
    if (cardId) {
      // カードIDから生徒を検索（シリアル番号を正規化）
      const normalizedCardId = cardId.trim().toLowerCase();
      
      const { data, error } = await supabase
        .from("students")
        .select("id, name, grade, status, class, role, card_id")
        .eq("card_id", normalizedCardId)
        .eq("site_id", siteId)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { ok: false, error: "このカードは登録されていません" },
          { status: 404 }
        );
      }

      student = data;
    } else if (studentId) {
      // 生徒IDから生徒を検索
      const { data, error } = await supabase
        .from("students")
        .select("id, name, grade, status, class, role, card_id")
        .eq("id", studentId)
        .eq("site_id", siteId)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { ok: false, error: "生徒が見つかりません" },
          { status: 404 }
        );
      }

      student = data;
    }

    // 2. 生徒のステータスチェック（在籍中のみ）
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

    // 3. role='student'のみLINE連携可能
    if (student.role !== "student") {
      return NextResponse.json(
        {
          ok: false,
          error: "この機能は生徒のみ利用可能です",
        },
        { status: 403 }
      );
    }

    // 4. 生徒に紐づいている親御さんを取得
    const { data: parentStudents, error: parentError } = await supabase
      .from("parent_students")
      .select(
        `
        parent_id,
        is_primary,
        parents!inner(
          id,
          name,
          phone_number,
          email,
          relationship
        )
      `
      )
      .eq("student_id", student.id);

    if (parentError) {
      const errorMessage = parentError.message || String(parentError);
      console.error(`[ParentLink] Failed to fetch parents:`, errorMessage);
      return NextResponse.json(
        { ok: false, error: "親御さん情報の取得に失敗しました" },
        { status: 500 }
      );
    }

    if (!parentStudents || parentStudents.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "この生徒には親御さんが登録されていません。運営にお問い合わせください。",
          student: {
            id: String(student.id),
            name: student.name,
          },
        },
        { status: 404 }
      );
    }

    // 5. 各親御さんのLINE連携状況を取得
    const parentIds = parentStudents.map((ps: any) => ps.parents.id);
    const { data: lineAccounts } = await supabase
      .from("parent_line_accounts")
      .select("parent_id, line_user_id, line_display_name, is_active")
      .in("parent_id", parentIds);

    // LINEアカウント情報をマップに変換
    const lineAccountsMap = new Map(
      (lineAccounts || []).map((acc: any) => [acc.parent_id, acc])
    );

    // 6. 親御さん情報にLINE連携状況を追加
    const parents = parentStudents.map((ps: any) => {
      const parent = ps.parents;
      const lineAccount = lineAccountsMap.get(parent.id);
      return {
        id: parent.id,
        name: parent.name,
        phoneNumber: parent.phone_number,
        email: parent.email,
        relationship: parent.relationship,
        isPrimary: ps.is_primary,
        lineConnected: !!lineAccount && lineAccount.is_active,
        lineDisplayName: lineAccount?.line_display_name || null,
      };
    });

    return NextResponse.json({
      ok: true,
      student: {
        id: String(student.id),
        name: student.name,
        grade: student.grade,
        class: student.class,
      },
      parents,
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    console.error(`[ParentLink] Error:`, errorMessage);
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
