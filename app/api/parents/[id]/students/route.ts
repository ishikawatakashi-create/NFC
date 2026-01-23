import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth-helpers";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// 親御さんと生徒の紐づけ一覧取得
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

    // サービスロールキーを使用してRLSをバイパス
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("parent_students")
      .select(
        `
        id,
        is_primary,
        students!inner(
          id,
          name,
          grade,
          class,
          role
        )
      `
      )
      .eq("parent_id", id)
      .eq("students.site_id", siteId);

    if (error) {
      const errorMessage = error.message || String(error);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    const students = (data || []).map((ps: any) => ({
      id: ps.students.id,
      name: ps.students.name,
      grade: ps.students.grade,
      class: ps.students.class,
      role: ps.students.role,
      isPrimary: ps.is_primary,
      linkId: ps.id,
    }));

    return NextResponse.json({ ok: true, students });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

// 親御さんと生徒の紐づけ追加
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { studentId, isPrimary } = body as {
      studentId: string;
      isPrimary?: boolean;
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

    if (!studentId) {
      return NextResponse.json({ ok: false, error: "studentId は必須です" }, { status: 400 });
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

    // 生徒が存在するか確認
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("id", studentId)
      .eq("site_id", siteId)
      .single();

    if (studentError || !studentData) {
      return NextResponse.json({ ok: false, error: "生徒が見つかりません" }, { status: 404 });
    }

    // 既存の紐づけを確認
    const { data: existingLink, error: checkError } = await supabase
      .from("parent_students")
      .select("id")
      .eq("parent_id", id)
      .eq("student_id", studentId)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      const errorMessage = checkError.message || String(checkError);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    if (existingLink) {
      return NextResponse.json(
        { ok: false, error: "既に紐づけられています" },
        { status: 400 }
      );
    }

    // 紐づけを作成
    const { data, error } = await supabase
      .from("parent_students")
      .insert([
        {
          parent_id: id,
          student_id: studentId,
          is_primary: isPrimary || false,
        },
      ])
      .select()
      .single();

    if (error) {
      const errorMessage = error.message || String(error);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      link: {
        id: data.id,
        parentId: data.parent_id,
        studentId: data.student_id,
        isPrimary: data.is_primary,
      },
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}



