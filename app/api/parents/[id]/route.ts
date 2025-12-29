import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// 親御さん情報取得
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

    const supabase = getSupabase();

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
          is_active,
          subscribed_at,
          unsubscribed_at
        ),
        parent_students(
          id,
          is_primary,
          students!inner(
            id,
            name,
            grade,
            class,
            role
          )
        )
      `
      )
      .eq("id", id)
      .eq("site_id", siteId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ ok: false, error: "親御さんが見つかりません" }, { status: 404 });
      }
      const errorMessage = error.message || String(error);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    const parent = {
      id: data.id,
      name: data.name,
      phoneNumber: data.phone_number,
      email: data.email,
      relationship: data.relationship,
      notes: data.notes,
      lineAccount: data.parent_line_accounts?.[0] || null,
      students: (data.parent_students || []).map((ps: any) => ({
        id: ps.students.id,
        name: ps.students.name,
        grade: ps.students.grade,
        class: ps.students.class,
        role: ps.students.role,
        isPrimary: ps.is_primary,
      })),
    };

    return NextResponse.json({ ok: true, parent });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

// 親御さん情報更新
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, phoneNumber, email, relationship, notes } = body as {
      name?: string;
      phoneNumber?: string;
      email?: string;
      relationship?: "mother" | "father" | "guardian" | "other";
      notes?: string;
    };

    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }

    const supabase = getSupabase();

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phoneNumber !== undefined) updateData.phone_number = phoneNumber || null;
    if (email !== undefined) updateData.email = email || null;
    if (relationship !== undefined) updateData.relationship = relationship || null;
    if (notes !== undefined) updateData.notes = notes || null;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("parents")
      .update(updateData)
      .eq("id", id)
      .eq("site_id", siteId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ ok: false, error: "親御さんが見つかりません" }, { status: 404 });
      }
      const errorMessage = error.message || String(error);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      parent: {
        id: data.id,
        name: data.name,
        phoneNumber: data.phone_number,
        email: data.email,
        relationship: data.relationship,
        notes: data.notes,
      },
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

// 親御さん削除
export async function DELETE(
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

    const supabase = getSupabase();

    const { error } = await supabase.from("parents").delete().eq("id", id).eq("site_id", siteId);

    if (error) {
      const errorMessage = error.message || String(error);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "親御さんを削除しました" });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}


