import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from "crypto";

/**
 * POST /api/line/link-card
 * NFCカードのシリアル番号とLINE User IDを紐づける
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, serialNumber } = body as {
      token: string;
      serialNumber: string;
    };

    if (!token || !serialNumber) {
      return NextResponse.json(
        { ok: false, error: "token と serialNumber は必須です" },
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

    // 1. トークンを検証
    const { data: linkToken, error: tokenError } = await supabase
      .from("line_link_tokens")
      .select("id, line_user_id, expires_at, is_used")
      .eq("token", token)
      .eq("site_id", siteId)
      .single();

    if (tokenError || !linkToken) {
      return NextResponse.json(
        { ok: false, error: "無効なトークンです" },
        { status: 404 }
      );
    }

    // トークンが使用済みかチェック
    if (linkToken.is_used) {
      return NextResponse.json(
        { ok: false, error: "このトークンは既に使用済みです" },
        { status: 400 }
      );
    }

    // トークンの有効期限をチェック
    const now = new Date();
    const expiresAt = new Date(linkToken.expires_at);
    if (now > expiresAt) {
      return NextResponse.json(
        { ok: false, error: "トークンの有効期限が切れています" },
        { status: 400 }
      );
    }

    // 2. シリアル番号から生徒を検索
    const normalizedSerial = serialNumber.trim().toLowerCase();
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, name, status, role")
      .eq("card_id", normalizedSerial)
      .eq("site_id", siteId)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { ok: false, error: "このカードは登録されていません。管理画面でカード登録を行ってください。" },
        { status: 404 }
      );
    }

    // 生徒が在籍中かチェック
    if (student.status !== "active") {
      return NextResponse.json(
        { ok: false, error: `${student.name}さんは現在在籍していません。` },
        { status: 400 }
      );
    }

    // 3. LINE User IDから親御さんを検索（既存のparent_line_accountsから）
    const { data: lineAccount, error: lineAccountError } = await supabase
      .from("parent_line_accounts")
      .select("id, parent_id, is_active")
      .eq("line_user_id", linkToken.line_user_id)
      .eq("site_id", siteId)
      .single();

    let parentId: string | null = null;

    if (lineAccountError && lineAccountError.code !== "PGRST116") {
      // PGRST116は「レコードが見つからない」エラーなので、親御さんが未登録の可能性
      console.log(`[LineLinkCard] LINE account not found for ${linkToken.line_user_id}, will create parent`);
    } else if (lineAccountError && lineAccountError.code === "PGRST116") {
      // 親御さんが未登録の場合、自動的に作成
      const { data: newParent, error: createParentError } = await supabase
        .from("parents")
        .insert({
          site_id: siteId,
          name: "LINEユーザー", // 後で更新可能
        })
        .select()
        .single();

      if (createParentError || !newParent) {
        return NextResponse.json(
          { ok: false, error: "親御さんの登録に失敗しました" },
          { status: 500 }
        );
      }

      parentId = newParent.id;

      // LINEアカウントも作成
      const { error: createLineAccountError } = await supabase
        .from("parent_line_accounts")
        .insert({
          parent_id: parentId,
          line_user_id: linkToken.line_user_id,
          is_active: true,
          subscribed_at: new Date().toISOString(),
        });

      if (createLineAccountError) {
        console.error(`[LineLinkCard] Failed to create LINE account:`, createLineAccountError);
      }
    } else if (lineAccount) {
      parentId = lineAccount.parent_id;

      // LINEアカウントが非アクティブの場合はアクティブ化
      if (!lineAccount.is_active) {
        await supabase
          .from("parent_line_accounts")
          .update({
            is_active: true,
            subscribed_at: new Date().toISOString(),
            unsubscribed_at: null,
          })
          .eq("id", lineAccount.id);
      }
    }

    if (!parentId) {
      return NextResponse.json(
        { ok: false, error: "親御さんの情報を取得できませんでした" },
        { status: 500 }
      );
    }

    // 4. 親御さんと生徒を紐づけ（既存の紐付けをチェック）
    // 注意: 1人の生徒に対して複数の親を紐づけることは可能です
    // このチェックは「同じ親が同じ生徒に重複して紐づけるのを防ぐ」ためのものです
    const { data: existingLink, error: checkLinkError } = await supabase
      .from("parent_students")
      .select("id")
      .eq("parent_id", parentId)
      .eq("student_id", student.id)
      .single();

    if (checkLinkError && checkLinkError.code !== "PGRST116") {
      return NextResponse.json(
        { ok: false, error: "紐付けの確認に失敗しました" },
        { status: 500 }
      );
    }

    if (!existingLink) {
      // 新規紐付け
      // この生徒に既に他の親が紐づいているかチェックして、is_primaryを設定
      const { data: existingParents } = await supabase
        .from("parent_students")
        .select("id")
        .eq("student_id", student.id);

      const isPrimary = !existingParents || existingParents.length === 0;

      const { error: linkError } = await supabase
        .from("parent_students")
        .insert({
          parent_id: parentId,
          student_id: student.id,
          is_primary: isPrimary, // 最初の紐付けのみ主連絡先とする
        });

      if (linkError) {
        return NextResponse.json(
          { ok: false, error: "親御さんと生徒の紐付けに失敗しました" },
          { status: 500 }
        );
      }
    }

    // 5. トークンを使用済みにする
    await supabase
      .from("line_link_tokens")
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
      })
      .eq("id", linkToken.id);

    return NextResponse.json({
      ok: true,
      message: `${student.name}さんとの紐付けが完了しました。`,
      student: {
        id: student.id,
        name: student.name,
      },
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    console.error(`[LineLinkCard] Error:`, errorMessage);
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

/**
 * GET /api/line/link-card
 * トークンの有効性を確認
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "token は必須です" },
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

    // トークンを検証
    const { data: linkToken, error: tokenError } = await supabase
      .from("line_link_tokens")
      .select("id, line_user_id, expires_at, is_used")
      .eq("token", token)
      .eq("site_id", siteId)
      .single();

    if (tokenError || !linkToken) {
      return NextResponse.json(
        { ok: false, error: "無効なトークンです" },
        { status: 404 }
      );
    }

    // トークンが使用済みかチェック
    if (linkToken.is_used) {
      return NextResponse.json(
        { ok: false, error: "このトークンは既に使用済みです", isUsed: true },
        { status: 400 }
      );
    }

    // トークンの有効期限をチェック
    const now = new Date();
    const expiresAt = new Date(linkToken.expires_at);
    if (now > expiresAt) {
      return NextResponse.json(
        { ok: false, error: "トークンの有効期限が切れています", isExpired: true },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      valid: true,
      expiresAt: linkToken.expires_at,
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    console.error(`[LineLinkCard] Error:`, errorMessage);
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
