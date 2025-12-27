import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// 一覧取得（ブラウザで開くとこれが動く）
export async function GET() {
  const siteId = process.env.SITE_ID;

  if (!siteId) {
    return NextResponse.json(
      { ok: false, error: "SITE_ID が .env.local に設定されていません" },
      { status: 500 }
    );
  }

  const supabase = getSupabase();

  // classカラムを含めて取得を試みる
  let { data, error } = await supabase
    .from("students")
    .select("id,name,grade,status,class,created_at")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });

  // classカラムが存在しない場合は、classカラムなしで再試行
  if (error && error.message?.includes("column students.class does not exist")) {
    const { data: dataWithoutClass, error: errorWithoutClass } = await supabase
      .from("students")
      .select("id,name,grade,status,created_at")
      .eq("site_id", siteId)
      .order("created_at", { ascending: false });
    
    if (errorWithoutClass) {
      const errorMessage = errorWithoutClass.message || String(errorWithoutClass);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }
    
    // classプロパティを追加して型を合わせる
    data = dataWithoutClass?.map((item: any) => ({ ...item, class: null })) || null;
    error = null;
  }

  if (error) {
    const errorMessage = error.message || String(error);
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }

  // idを必ずstringに変換
  const students = (data || []).map((s) => ({
    ...s,
    id: String(s.id),
  }));

  return NextResponse.json({ ok: true, students });
}

// 生徒追加
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, grade, class: studentClass } = body as { name: string; grade?: string; class?: string };

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

    // classカラムを含めて挿入を試みる
    const insertData: any = {
      site_id: siteId,
      name,
      grade: grade ?? null,
      status: "active"
    };

    if (studentClass) {
      insertData.class = studentClass;
    }

    let { data, error } = await supabase
      .from("students")
      .insert([insertData])
      .select("id,name,grade,status,class,created_at")
      .single();

    // classカラムが存在しない場合は、classカラムなしで再試行
    if (error && error.message?.includes("column students.class does not exist")) {
      const insertDataWithoutClass: any = {
        site_id: siteId,
        name,
        grade: grade ?? null,
        status: "active"
      };

      const { data: dataWithoutClass, error: errorWithoutClass } = await supabase
        .from("students")
        .insert([insertDataWithoutClass])
        .select("id,name,grade,status,created_at")
        .single();

      if (errorWithoutClass) {
        const errorMessage = errorWithoutClass.message || String(errorWithoutClass);
        return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
      }

      // classプロパティを追加して型を合わせる
      data = dataWithoutClass ? { ...dataWithoutClass, class: null } : null;
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
