import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth-helpers";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getRoleBasedAccessTime } from "@/lib/access-time-utils";

// 個別の生徒情報を取得
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }

    const { admin, response } = await requireAdminApi();
    if (!admin) {
      return response;
    }

    if (!id) {
      return NextResponse.json({ ok: false, error: "id は必須です" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // classカラム、card_id、role、最終イベント情報、個別開放時間、ポイント情報を含めて取得を試みる
    let { data, error } = await supabase
      .from("students")
      .select("id,name,grade,status,class,role,card_id,last_event_type,last_event_timestamp,access_start_time,access_end_time,has_custom_access_time,current_points,bonus_threshold,has_custom_bonus_threshold,created_at")
      .eq("id", id)
      .eq("site_id", siteId)
      .single();

    // カラムが存在しない場合は、存在するカラムのみで再試行
    if (error && (error.message?.includes("column students.class does not exist") ||
                  error.message?.includes("column students.role does not exist") ||
                  error.message?.includes("column students.card_id does not exist") ||
                  error.message?.includes("column students.last_event_type does not exist") ||
                  error.message?.includes("column students.access_start_time does not exist") ||
                  error.message?.includes("column students.current_points does not exist"))) {
      const { data: dataFallback, error: errorFallback } = await supabase
        .from("students")
        .select("id,name,grade,status,created_at")
        .eq("id", id)
        .eq("site_id", siteId)
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
        has_custom_access_time: false,
        current_points: 0,
        bonus_threshold: null,
        has_custom_bonus_threshold: false
      } : null;
      error = null;
    }

    if (error) {
      const errorMessage = error.message || String(error);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: "生徒が見つかりません" }, { status: 404 });
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

// 個別の生徒情報を更新（PATCH用 - 部分更新）
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, grade, class: studentClass, status, role, cardId, card_id, access_start_time, access_end_time, has_custom_access_time, bonus_threshold, has_custom_bonus_threshold } = body as { 
      name?: string; 
      grade?: string; 
      class?: string | null; 
      status?: string;
      role?: string;
      cardId?: string | null;
      card_id?: string | null;
      access_start_time?: string | null;
      access_end_time?: string | null;
      has_custom_access_time?: boolean;
      bonus_threshold?: number | null;
      has_custom_bonus_threshold?: boolean;
    };

    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }

    const { admin, response } = await requireAdminApi();
    if (!admin) {
      return response;
    }

    if (!id) {
      return NextResponse.json({ ok: false, error: "id は必須です" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 現在の生徒情報を取得
    const { data: currentStudent } = await supabase
      .from("students")
      .select("name, role, access_start_time, access_end_time, has_custom_access_time")
      .eq("id", id)
      .eq("site_id", siteId)
      .single();

    if (!currentStudent) {
      return NextResponse.json({ ok: false, error: "生徒が見つかりません" }, { status: 404 });
    }

    // 更新データを構築（提供されたフィールドのみ）
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (grade !== undefined) updateData.grade = grade ?? null;
    if (status !== undefined) updateData.status = status;
    if (role !== undefined) updateData.role = role;
    if (studentClass !== undefined) updateData.class = studentClass;
    
    // cardId と card_id の両方に対応
    const cardIdValue = cardId !== undefined ? cardId : card_id;
    if (cardIdValue !== undefined) {
      // カードIDが空でない場合、重複チェック
      if (cardIdValue && cardIdValue.trim() !== "") {
        const normalizedCardId = cardIdValue.trim().toLowerCase();
        
        // 同じcard_idが他の生徒に登録されていないか確認
        const { data: existingStudent, error: checkError } = await supabase
          .from("students")
          .select("id, name")
          .eq("card_id", normalizedCardId)
          .eq("site_id", siteId)
          .neq("id", id) // 現在の生徒以外
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
      updateData.card_id = cardIdValue;
    }

    if (access_start_time !== undefined) updateData.access_start_time = access_start_time;
    if (access_end_time !== undefined) updateData.access_end_time = access_end_time;
    if (has_custom_access_time !== undefined) updateData.has_custom_access_time = has_custom_access_time;
    if (bonus_threshold !== undefined) updateData.bonus_threshold = bonus_threshold;
    if (has_custom_bonus_threshold !== undefined) updateData.has_custom_bonus_threshold = has_custom_bonus_threshold;

    // 更新するフィールドがない場合
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ ok: false, error: "更新するフィールドが指定されていません" }, { status: 400 });
    }

    // 役割に基づいた開放時間の自動設定
    const newRole = role !== undefined ? role : currentStudent?.role;
    const hasCustomAccessTime = has_custom_access_time !== undefined 
      ? has_custom_access_time 
      : currentStudent?.has_custom_access_time;
    
    const shouldUseRoleBasedTime = 
      (access_start_time === undefined && access_end_time === undefined) && 
      (!hasCustomAccessTime || hasCustomAccessTime === false);

    if (shouldUseRoleBasedTime && newRole && role !== undefined) {
      const roleAccessTime = await getRoleBasedAccessTime(
        siteId,
        newRole as "student" | "part_time" | "full_time"
      );
      
      if (roleAccessTime) {
        updateData.access_start_time = roleAccessTime.start_time;
        updateData.access_end_time = roleAccessTime.end_time;
        updateData.has_custom_access_time = false;
      }
    }

    // データベースを更新
    let { data, error } = await supabase
      .from("students")
      .update(updateData)
      .eq("id", id)
      .eq("site_id", siteId)
      .select("id,name,grade,status,class,role,card_id,last_event_type,last_event_timestamp,access_start_time,access_end_time,has_custom_access_time,current_points,bonus_threshold,has_custom_bonus_threshold,created_at")
      .single();

    // カラムが存在しない場合のフォールバック
    if (error && (error.message?.includes("column students.class does not exist") ||
                  error.message?.includes("column students.role does not exist") ||
                  error.message?.includes("column students.card_id does not exist") ||
                  error.message?.includes("column students.last_event_type does not exist") ||
                  error.message?.includes("column students.access_start_time does not exist"))) {
      
      const updateDataFallback: any = {};
      if (name !== undefined) updateDataFallback.name = name;
      if (grade !== undefined) updateDataFallback.grade = grade ?? null;
      if (status !== undefined) updateDataFallback.status = status;

      const { data: dataFallback, error: errorFallback } = await supabase
        .from("students")
        .update(updateDataFallback)
        .eq("id", id)
        .eq("site_id", siteId)
        .select("id,name,grade,status,created_at")
        .single();

      if (errorFallback) {
        const errorMessage = errorFallback.message || String(errorFallback);
        return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
      }

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
      return NextResponse.json({ ok: false, error: "生徒が見つかりません" }, { status: 404 });
    }

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

// 個別の生徒情報を更新
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, grade, class: studentClass, status, role, card_id, access_start_time, access_end_time, has_custom_access_time, bonus_threshold, has_custom_bonus_threshold } = body as { 
      name?: string; 
      grade?: string; 
      class?: string | null; 
      status?: string;
      role?: string;
      card_id?: string | null;
      access_start_time?: string | null;
      access_end_time?: string | null;
      has_custom_access_time?: boolean;
      bonus_threshold?: number | null;
      has_custom_bonus_threshold?: boolean;
    };

    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }

    const { admin, response } = await requireAdminApi();
    if (!admin) {
      return response;
    }

    if (!id) {
      return NextResponse.json({ ok: false, error: "id は必須です" }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ ok: false, error: "name は必須です" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 現在のユーザー情報を取得（個別設定の有無を確認するため）
    const { data: currentStudent } = await supabase
      .from("students")
      .select("role, access_start_time, access_end_time, has_custom_access_time")
      .eq("id", id)
      .eq("site_id", siteId)
      .single();

    // classカラム、card_id、roleを含めて更新を試みる
    const updateData: any = {
      name,
      grade: grade ?? null,
    };

    // statusが指定されている場合は更新
    if (status !== undefined) {
      updateData.status = status;
    }

    // roleが指定されている場合は更新
    const newRole = role !== undefined ? role : currentStudent?.role;
    if (role !== undefined) {
      updateData.role = role;
    }

    // classが明示的にnullまたはundefinedの場合はnullを設定、それ以外の場合は値を設定
    if (studentClass !== undefined) {
      updateData.class = studentClass;
    }

    // card_idが指定されている場合は更新
    if (card_id !== undefined) {
      // カードIDが空でない場合、重複チェック
      if (card_id && card_id.trim() !== "") {
        const normalizedCardId = card_id.trim().toLowerCase();
        
        // 同じcard_idが他の生徒に登録されていないか確認
        const { data: existingStudent, error: checkError } = await supabase
          .from("students")
          .select("id, name")
          .eq("card_id", normalizedCardId)
          .eq("site_id", siteId)
          .neq("id", id) // 現在の生徒以外
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
      updateData.card_id = card_id;
    }

    // 個別開放時間設定が明示的に指定されている場合は更新
    if (access_start_time !== undefined) {
      updateData.access_start_time = access_start_time;
    }
    if (access_end_time !== undefined) {
      updateData.access_end_time = access_end_time;
    }
    if (has_custom_access_time !== undefined) {
      updateData.has_custom_access_time = has_custom_access_time;
    }

    // 個別ボーナス閾値設定が明示的に指定されている場合は更新
    if (bonus_threshold !== undefined) {
      updateData.bonus_threshold = bonus_threshold;
    }
    if (has_custom_bonus_threshold !== undefined) {
      updateData.has_custom_bonus_threshold = has_custom_bonus_threshold;
    }

    // 個別設定が明示的に指定されていない場合、かつ個別設定がない（または未設定）場合、
    // 属性に紐づいた開放時間を自動設定
    const hasCustomAccessTime = has_custom_access_time !== undefined 
      ? has_custom_access_time 
      : currentStudent?.has_custom_access_time;
    
    const shouldUseRoleBasedTime = 
      (access_start_time === undefined && access_end_time === undefined) && // 明示的に指定されていない
      (!hasCustomAccessTime || hasCustomAccessTime === false); // 個別設定がない

    if (shouldUseRoleBasedTime && newRole) {
      const roleAccessTime = await getRoleBasedAccessTime(
        siteId,
        newRole as "student" | "part_time" | "full_time"
      );
      
      if (roleAccessTime) {
        updateData.access_start_time = roleAccessTime.start_time;
        updateData.access_end_time = roleAccessTime.end_time;
        updateData.has_custom_access_time = false;
      }
    }

    let { data, error } = await supabase
      .from("students")
      .update(updateData)
      .eq("id", id)
      .eq("site_id", siteId)
      .select("id,name,grade,status,class,role,card_id,last_event_type,last_event_timestamp,access_start_time,access_end_time,has_custom_access_time,current_points,bonus_threshold,has_custom_bonus_threshold,created_at")
      .single();

    // カラムが存在しない場合は、存在するカラムのみで再試行
    if (error && (error.message?.includes("column students.class does not exist") ||
                  error.message?.includes("column students.role does not exist") ||
                  error.message?.includes("column students.card_id does not exist") ||
                  error.message?.includes("column students.last_event_type does not exist") ||
                  error.message?.includes("column students.access_start_time does not exist"))) {
      const updateDataFallback: any = {
        name,
        grade: grade ?? null,
      };

      // statusが指定されている場合は更新
      if (status !== undefined) {
        updateDataFallback.status = status;
      }

      const { data: dataFallback, error: errorFallback } = await supabase
        .from("students")
        .update(updateDataFallback)
        .eq("id", id)
        .eq("site_id", siteId)
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
      return NextResponse.json({ ok: false, error: "生徒が見つかりません" }, { status: 404 });
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
