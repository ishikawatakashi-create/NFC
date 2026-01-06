import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// LINEアカウント情報取得
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

    // LINEアカウント情報を取得
    const { data, error } = await supabase
      .from("parent_line_accounts")
      .select("id, line_user_id, line_display_name, is_active, subscribed_at, unsubscribed_at")
      .eq("parent_id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ ok: true, lineAccount: null });
      }
      const errorMessage = error.message || String(error);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      lineAccount: {
        id: data.id,
        lineUserId: data.line_user_id,
        lineDisplayName: data.line_display_name,
        isActive: data.is_active,
        subscribedAt: data.subscribed_at,
        unsubscribedAt: data.unsubscribed_at,
      },
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

// LINEアカウント紐づけ（LINE User IDを手動で設定）
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { lineUserId, lineDisplayName } = body as {
      lineUserId: string;
      lineDisplayName?: string;
    };

    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }

    if (!lineUserId) {
      return NextResponse.json({ ok: false, error: "lineUserId は必須です" }, { status: 400 });
    }

    const supabase = getSupabase();

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

    // 既存のLINEアカウント情報を確認
    const { data: existingAccount, error: checkError } = await supabase
      .from("parent_line_accounts")
      .select("id")
      .eq("parent_id", id)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      const errorMessage = checkError.message || String(checkError);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    if (existingAccount) {
      // 既存のアカウントがある場合、更新
      const { data, error } = await supabase
        .from("parent_line_accounts")
        .update({
          line_user_id: lineUserId,
          line_display_name: lineDisplayName || null,
          is_active: true,
          subscribed_at: new Date().toISOString(),
          unsubscribed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingAccount.id)
        .select()
        .single();

      if (error) {
        const errorMessage = error.message || String(error);
        return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        lineAccount: {
          id: data.id,
          lineUserId: data.line_user_id,
          lineDisplayName: data.line_display_name,
          isActive: data.is_active,
        },
      });
    } else {
      // 新規作成
      const { data, error } = await supabase
        .from("parent_line_accounts")
        .insert([
          {
            parent_id: id,
            line_user_id: lineUserId,
            line_display_name: lineDisplayName || null,
            is_active: true,
            subscribed_at: new Date().toISOString(),
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
        lineAccount: {
          id: data.id,
          lineUserId: data.line_user_id,
          lineDisplayName: data.line_display_name,
          isActive: data.is_active,
        },
      });
    }
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

// LINEアカウント削除（紐づけ解除）
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

    // LINEアカウントを非アクティブ化（削除ではなく非アクティブ化）
    const { error } = await supabase
      .from("parent_line_accounts")
      .update({
        is_active: false,
        unsubscribed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("parent_id", id);

    if (error) {
      const errorMessage = error.message || String(error);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "LINEアカウントの紐づけを解除しました" });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}




