import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth-helpers";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// 親御さん一覧取得
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

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

    if (studentId) {
      // 特定の生徒に紐づいている親御さんを取得
      const { data, error } = await supabase
        .from("parent_students")
        .select(
          `
          id,
          is_primary,
          parents!inner(
            id,
            name,
            phone_number,
            email,
            relationship,
            notes,
            parent_line_accounts(
              id,
              line_user_id,
              line_display_name,
              is_active
            )
          )
        `
        )
        .eq("student_id", studentId)
        .eq("parents.site_id", siteId);

      if (error) {
        const errorMessage = error.message || String(error);
        return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
      }

      const parents = (data || []).map((ps: any) => ({
        id: ps.parents.id,
        name: ps.parents.name,
        phoneNumber: ps.parents.phone_number,
        email: ps.parents.email,
        relationship: ps.parents.relationship,
        notes: ps.parents.notes,
        isPrimary: ps.is_primary,
        lineAccount: ps.parents.parent_line_accounts?.[0] || null,
      }));

      return NextResponse.json({ ok: true, parents });
    } else {
      // 全親御さんを取得
      const { data, error } = await supabase
        .from("parents")
        .select(
          `
          id,
          name,
          phone_number,
          email,
          relationship,
          notes,
          parent_line_accounts(
            id,
            line_user_id,
            line_display_name,
            is_active
          )
        `
        )
        .eq("site_id", siteId)
        .order("created_at", { ascending: false });

      if (error) {
        const errorMessage = error.message || String(error);
        return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
      }

      const parents = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        phoneNumber: p.phone_number,
        email: p.email,
        relationship: p.relationship,
        notes: p.notes,
        lineAccount: p.parent_line_accounts?.[0] ? {
          id: p.parent_line_accounts[0].id,
          lineUserId: p.parent_line_accounts[0].line_user_id,
          lineDisplayName: p.parent_line_accounts[0].line_display_name,
          isActive: p.parent_line_accounts[0].is_active,
        } : null,
      }));

      return NextResponse.json({ ok: true, parents });
    }
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

// 親御さん追加
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phoneNumber, email, relationship, notes, studentIds } = body as {
      name: string;
      phoneNumber?: string;
      email?: string;
      relationship?: "mother" | "father" | "guardian" | "other";
      notes?: string;
      studentIds?: string[]; // 紐づける生徒IDの配列
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

    if (!name) {
      return NextResponse.json({ ok: false, error: "name は必須です" }, { status: 400 });
    }

    // サービスロールキーを使用してRLSをバイパス
    const supabase = getSupabaseAdmin();

    // 親御さんを追加
    const { data: parentData, error: parentError } = await supabase
      .from("parents")
      .insert([
        {
          site_id: siteId,
          name,
          phone_number: phoneNumber || null,
          email: email || null,
          relationship: relationship || null,
          notes: notes || null,
        },
      ])
      .select()
      .single();

    if (parentError) {
      const errorMessage = parentError.message || String(parentError);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    // 生徒との紐づけ
    if (studentIds && studentIds.length > 0) {
      const parentStudentLinks = studentIds.map((studentId, index) => ({
        parent_id: parentData.id,
        student_id: studentId,
        is_primary: index === 0, // 最初の生徒を主な連絡先とする
      }));

      const { error: linkError } = await supabase
        .from("parent_students")
        .insert(parentStudentLinks);

      if (linkError) {
        // 親御さんは作成できたが、紐づけに失敗した場合は警告のみ
        console.warn("Failed to link students to parent:", linkError);
      }
    }

    return NextResponse.json({
      ok: true,
      parent: {
        id: parentData.id,
        name: parentData.name,
        phoneNumber: parentData.phone_number,
        email: parentData.email,
        relationship: parentData.relationship,
        notes: parentData.notes,
      },
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}



