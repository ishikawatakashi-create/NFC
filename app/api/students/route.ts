import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRoleBasedAccessTime } from "@/lib/access-time-utils";
import { getCurrentAdmin } from "@/lib/auth-helpers";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// 一覧取得（ブラウザで開くとこれが動く）
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cardId = searchParams.get("cardId");

  const siteId = process.env.SITE_ID;

  if (!siteId) {
    return NextResponse.json(
      { ok: false, error: "SITE_ID が .env.local に設定されていません" },
      { status: 500 }
    );
  }

  const supabase = getSupabase();

  // classカラム、card_id、role、最終イベント情報、個別開放時間、ポイント情報を含めて取得を試みる
  let query = supabase
    .from("students")
    .select("id,name,grade,status,class,role,card_id,last_event_type,last_event_timestamp,access_start_time,access_end_time,has_custom_access_time,current_points,created_at")
    .eq("site_id", siteId);

  // カードIDでフィルタ
  if (cardId) {
    query = query.eq("card_id", cardId);
  }

  let { data, error } = await query.order("created_at", { ascending: false });

    // カラムが存在しない場合は、存在するカラムのみで再試行
    if (error && (error.message?.includes("column students.class does not exist") || 
                  error.message?.includes("column students.card_id does not exist") ||
                  error.message?.includes("column students.role does not exist") ||
                  error.message?.includes("column students.last_event_type does not exist") ||
                  error.message?.includes("column students.access_start_time does not exist") ||
                  error.message?.includes("column students.current_points does not exist"))) {
    const { data: dataFallback, error: errorFallback } = await supabase
      .from("students")
      .select("id,name,grade,status,created_at")
      .eq("site_id", siteId)
      .order("created_at", { ascending: false });
    
    if (errorFallback) {
      const errorMessage = errorFallback.message || String(errorFallback);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }
    
    // 不足しているプロパティを追加して型を合わせる
    data = dataFallback?.map((item: any) => ({ 
      ...item, 
      class: null,
      role: null,
      card_id: null,
      last_event_type: null,
      last_event_timestamp: null,
      access_start_time: null,
      access_end_time: null,
      has_custom_access_time: false,
      current_points: 0
    })) || null;
    error = null;
  }

  if (error) {
    const errorMessage = error.message || String(error);
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }

  // idを必ずstringに変換
  const studentIds = (data || []).map((s) => String(s.id));
  const students = (data || []).map((s) => ({
    ...s,
    id: String(s.id),
  }));

  // カード登録状態を取得（student_cards と card_tokens を別々に取得してマージ）
  let cardRegistrations: Record<string, { isRegistered: boolean; isActive: boolean; token?: string; cardTokenId?: string }> = {};
  
  if (studentIds.length > 0) {
    try {
      // 1. student_cards を取得
      const { data: studentCards, error: studentCardsError } = await supabase
        .from("student_cards")
        .select("student_id, card_token_id")
        .in("student_id", studentIds);

      if (!studentCardsError && studentCards && studentCards.length > 0) {
        // 2. card_token_id のリストを作成
        const cardTokenIds = studentCards.map((sc) => sc.card_token_id);

        // 3. card_tokens を取得
        const { data: cardTokens, error: cardTokensError } = await supabase
          .from("card_tokens")
          .select("id, token, is_active")
          .in("id", cardTokenIds);

        if (!cardTokensError && cardTokens) {
          // 4. card_tokens をマップに変換（id をキーに）
          const cardTokenMap = new Map(
            cardTokens.map((ct) => [ct.id, { token: ct.token, is_active: ct.is_active }])
          );

          // 5. student_cards と card_tokens をマージ
          studentCards.forEach((sc) => {
            const studentId = String(sc.student_id);
            const cardToken = cardTokenMap.get(sc.card_token_id);
            if (cardToken) {
              cardRegistrations[studentId] = {
                isRegistered: true,
                isActive: cardToken.is_active || false,
                token: cardToken.token,
                cardTokenId: sc.card_token_id,
              };
            }
          });
        }
      }
    } catch (e) {
      // カード登録情報の取得に失敗しても、生徒一覧は返す
      console.error("Failed to fetch card registrations:", e);
    }
  }

  // カード登録状態を各生徒に追加
  const studentsWithCards = students.map((student) => {
    const cardInfo = cardRegistrations[student.id] || {
      isRegistered: false,
      isActive: false,
    };
    // student_cardsにレコードがある場合、またはcard_idが存在する場合は登録済みと判定（後方互換性のため）
    const isCardRegistered = cardInfo.isRegistered || (student.card_id != null && student.card_id.trim() !== "");
    // student_cardsにレコードがある場合はそのis_activeを使用、ない場合はcard_idがある場合は有効とみなす
    const isCardActive = cardInfo.isRegistered ? cardInfo.isActive : (student.card_id != null && student.card_id.trim() !== "");
    return {
      ...student,
      card_registered: isCardRegistered,
      card_active: isCardActive,
      card_token: cardInfo.token || null,
      card_token_id: cardInfo.cardTokenId || null,
    };
  });

  return NextResponse.json({ ok: true, students: studentsWithCards });
}

// ユーザー追加
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, grade, class: studentClass, role, card_id } = body as { name: string; grade?: string; class?: string; role?: string; card_id?: string };

    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }
    if (!name) {
      return NextResponse.json({ ok: false, error: "name は必須です" }, { status: 400 });
    }

    const supabase = getSupabase();

    // カードIDが指定されている場合、重複チェック
    if (card_id && card_id.trim() !== "") {
      const normalizedCardId = card_id.trim().toLowerCase();
      
      // 同じcard_idが他の生徒に登録されていないか確認
      const { data: existingStudent, error: checkError } = await supabase
        .from("students")
        .select("id, name")
        .eq("card_id", normalizedCardId)
        .eq("site_id", siteId)
        .single();
      
      if (checkError && checkError.code !== "PGRST116") { // PGRST116は「結果が見つからない」エラー（正常）
        const errorMessage = checkError.message || String(checkError);
        return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
      }
      
      if (existingStudent) {
        return NextResponse.json(
          { 
            ok: false, 
            error: `このカードは「${existingStudent.name}」にて登録済みのため登録できません` 
          },
          { status: 400 }
        );
      }
    }

    // 属性に紐づいた開放時間を取得
    const userRole = (role || "student") as "student" | "part_time" | "full_time";
    const roleAccessTime = await getRoleBasedAccessTime(siteId, userRole);

    // classカラム、roleを含めて挿入を試みる
    const insertData: any = {
      site_id: siteId,
      name,
      grade: grade ?? null,
      status: "active",
      role: userRole,
    };

    if (studentClass) {
      insertData.class = studentClass;
    }

    // card_idが指定されている場合は追加
    if (card_id && card_id.trim() !== "") {
      insertData.card_id = card_id.trim().toLowerCase();
    }

    // 属性に紐づいた開放時間を個別設定カラムに設定
    if (roleAccessTime) {
      insertData.access_start_time = roleAccessTime.start_time;
      insertData.access_end_time = roleAccessTime.end_time;
      insertData.has_custom_access_time = false; // 新規登録時は属性設定を使用
    }

    let { data, error } = await supabase
      .from("students")
      .insert([insertData])
      .select("id,name,grade,status,class,role,card_id,last_event_type,last_event_timestamp,access_start_time,access_end_time,has_custom_access_time,created_at")
      .single();

    // カラムが存在しない場合は、存在するカラムのみで再試行
    if (error && (error.message?.includes("column students.class does not exist") ||
                  error.message?.includes("column students.role does not exist") ||
                  error.message?.includes("column students.card_id does not exist") ||
                  error.message?.includes("column students.last_event_type does not exist") ||
                  error.message?.includes("column students.access_start_time does not exist"))) {
      const insertDataFallback: any = {
        site_id: siteId,
        name,
        grade: grade ?? null,
        status: "active"
      };

      const { data: dataFallback, error: errorFallback } = await supabase
        .from("students")
        .insert([insertDataFallback])
        .select("id,name,grade,status,created_at")
        .single();

      if (errorFallback) {
        const errorMessage = errorFallback.message || String(errorFallback);
        return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
      }

      // 不足しているプロパティを追加して型を合わせる
      data = dataFallback ? { 
        ...dataFallback, 
        class: null,
        role: null,
        card_id: null,
        last_event_type: null,
        last_event_timestamp: null,
        access_start_time: null,
        access_end_time: null,
        has_custom_access_time: false
      } : null;
      error = null;
    }

    if (error) {
      const errorMessage = error.message || String(error);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: "データの取得に失敗しました" }, { status: 500 });
    }

    // idを必ずstringに変換
    const student = {
      ...data,
      id: String(data.id),
    };

    return NextResponse.json({ ok: true, student });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

// 生徒削除
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    console.log(`[Students] DELETE request received: studentId=${id}`);

    if (!id) {
      console.error("[Students] DELETE: studentId is required");
      return NextResponse.json({ ok: false, error: "id は必須です" }, { status: 400 });
    }

    const siteId = process.env.SITE_ID;

    if (!siteId) {
      console.error("[Students] DELETE: SITE_ID is not set");
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }

    const supabase = getSupabase();

    // 削除前に生徒情報を取得（ログ用）
    const { data: studentData, error: fetchError } = await supabase
      .from("students")
      .select("id, name, site_id")
      .eq("id", id)
      .eq("site_id", siteId)
      .single();

    if (fetchError || !studentData) {
      console.error(`[Students] DELETE: Student not found: id=${id}, error=${fetchError?.message || "Not found"}`);
      return NextResponse.json(
        { ok: false, error: "生徒が見つかりません" },
        { status: 404 }
      );
    }

    // 現在の管理者情報を取得（ログ用）
    const adminInfo = await getCurrentAdmin();
    const adminName = adminInfo ? `${adminInfo.firstName} ${adminInfo.lastName}` : "Unknown";
    const adminId = adminInfo?.id || "Unknown";

    console.log(`[Students] DELETE: Attempting to delete student: id=${id}, name=${studentData.name}, site_id=${siteId}, admin=${adminName} (${adminId})`);

    // site_idも確認して削除（セキュリティのため）
    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", id)
      .eq("site_id", siteId);

    if (error) {
      const errorMessage = error.message || String(error);
      console.error(`[Students] DELETE: Failed to delete student: id=${id}, error=${errorMessage}`);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    console.log(`[Students] DELETE: Successfully deleted student: id=${id}, name=${studentData.name}, site_id=${siteId}, admin=${adminName} (${adminId})`);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    console.error(`[Students] DELETE: Unexpected error: ${errorMessage}`, e);
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}