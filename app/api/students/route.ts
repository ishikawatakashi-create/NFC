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

  const { data, error } = await supabase
    .from("students")
    .select("id,name,grade,status,created_at")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error }, { status: 500 });

  return NextResponse.json({ ok: true, students: data });
}

// 生徒追加
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, grade } = body as { name: string; grade?: string };

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

    const { data, error } = await supabase
      .from("students")
      .insert([{ site_id: siteId, name, grade: grade ?? null, status: "active" }])
      .select("id,name,grade,status,created_at")
      .single();

    if (error) return NextResponse.json({ ok: false, error }, { status: 500 });

    return NextResponse.json({ ok: true, student: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? e }, { status: 500 });
  }
}
