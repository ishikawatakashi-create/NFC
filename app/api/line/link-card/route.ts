import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getLineProfile } from "@/lib/line-webhook-utils";
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

    // 3. トークンを原子的に使用済みにする（重複利用防止）
    const claimTime = new Date();
    const { data: claimedToken, error: claimError } = await supabase
      .from("line_link_tokens")
      .update({
        is_used: true,
        used_at: claimTime.toISOString(),
      })
      .eq("id", linkToken.id)
      .eq("site_id", siteId)
      .eq("is_used", false)
      .gte("expires_at", claimTime.toISOString())
      .select("id")
      .single();

    if (claimError && claimError.code !== "PGRST116") {
      return NextResponse.json(
        { ok: false, error: `トークンの更新に失敗しました: ${claimError.message}` },
        { status: 500 }
      );
    }

    if (!claimedToken) {
      if (claimTime > expiresAt) {
        return NextResponse.json(
          { ok: false, error: "トークンの有効期限が切れています" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { ok: false, error: "このトークンは既に使用済みです" },
        { status: 400 }
      );
    }

    // 4. LINE User IDから親御さんを検索（既存のparent_line_accountsから）
    // 注意: parent_line_accountsテーブルにはsite_idカラムがないため、
    // parentsテーブル経由でsite_idでフィルタリングする
    console.log(`[LineLinkCard] Looking up LINE account for user: ${linkToken.line_user_id}`);
    
    const { data: lineAccount, error: lineAccountError } = await supabase
      .from("parent_line_accounts")
      .select("id, parent_id, is_active, parents!inner(site_id)")
      .eq("line_user_id", linkToken.line_user_id)
      .eq("parents.site_id", siteId)
      .single();

    let parentId: string | null = null;

    if (lineAccountError) {
      if (lineAccountError.code === "PGRST116") {
        // レコードが見つからない = 親御さんが未登録 → 自動的に作成
        console.log(`[LineLinkCard] LINE account not found for ${linkToken.line_user_id}, creating new parent`);
        
        // LINEプロフィール情報を取得
        const profile = await getLineProfile(linkToken.line_user_id);
        const parentName = profile?.displayName || "LINEユーザー";
        
        const { data: newParent, error: createParentError } = await supabase
          .from("parents")
          .insert({
            site_id: siteId,
            name: parentName,
          })
          .select()
          .single();

        if (createParentError || !newParent) {
          console.error(`[LineLinkCard] Failed to create parent:`, createParentError);
          return NextResponse.json(
            { 
              ok: false, 
              error: `親御さんの登録に失敗しました: ${createParentError?.message || "不明なエラー"}` 
            },
            { status: 500 }
          );
        }

        parentId = newParent.id;
        console.log(`[LineLinkCard] Created new parent: ${parentId}`);

        // LINEアカウントも作成
        // 注意: parent_line_accountsテーブルにはsite_idカラムがない（parentsテーブル経由で管理）
        const { error: createLineAccountError } = await supabase
          .from("parent_line_accounts")
          .insert({
            parent_id: parentId,
            line_user_id: linkToken.line_user_id,
            line_display_name: parentName,
            is_active: true,
            subscribed_at: new Date().toISOString(),
          });

        if (createLineAccountError) {
          console.error(`[LineLinkCard] Failed to create LINE account:`, createLineAccountError);
          // 親御さんは作成できたが、LINEアカウントの作成に失敗
          // この場合は親御さんIDを返して続行（後でLINEアカウントを手動で紐づけ可能）
        } else {
          console.log(`[LineLinkCard] Created LINE account for parent: ${parentId}`);
        }
      } else {
        // その他のエラー
        console.error(`[LineLinkCard] Error looking up LINE account:`, lineAccountError);
        return NextResponse.json(
          { 
            ok: false, 
            error: `LINEアカウントの検索に失敗しました: ${lineAccountError.message || "不明なエラー"}` 
          },
          { status: 500 }
        );
      }
    } else if (lineAccount) {
      // 既存のLINEアカウントが見つかった
      parentId = lineAccount.parent_id;
      console.log(`[LineLinkCard] Found existing LINE account, parent ID: ${parentId}`);

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
        console.log(`[LineLinkCard] Reactivated LINE account for parent: ${parentId}`);
      }
    }

    if (!parentId) {
      console.error(`[LineLinkCard] parentId is null after all processing. LINE User ID: ${linkToken.line_user_id}`);
      return NextResponse.json(
        { 
          ok: false, 
          error: "親御さんの情報を取得できませんでした。LINEアカウントとの紐付けに失敗した可能性があります。" 
        },
        { status: 500 }
      );
    }

    // 5. 親御さんと生徒を紐づけ（既存の紐付けをチェック）
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
