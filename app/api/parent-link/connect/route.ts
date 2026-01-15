import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/parent-link/connect
 * LINEユーザーIDと親御さんを自動紐付けする
 * 
 * リクエストボディ:
 * - lineUserId: LINEユーザーID（必須）
 * - lineDisplayName: LINE表示名（オプション）
 * - parentId: 親御さんID（必須）
 * - studentId: 生徒ID（必須）
 * 
 * レスポンス:
 * - ok: true/false
 * - message: メッセージ
 * - alreadyConnected: 既に連携済みの場合true
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lineUserId, lineDisplayName, parentId, studentId } = body as {
      lineUserId: string;
      lineDisplayName?: string;
      parentId: string;
      studentId: string;
    };

    // バリデーション
    if (!lineUserId) {
      return NextResponse.json(
        { ok: false, error: "lineUserId は必須です" },
        { status: 400 }
      );
    }

    if (!parentId) {
      return NextResponse.json(
        { ok: false, error: "parentId は必須です" },
        { status: 400 }
      );
    }

    if (!studentId) {
      return NextResponse.json(
        { ok: false, error: "studentId は必須です" },
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

    // 1. 親御さんが存在するか確認
    const { data: parentData, error: parentError } = await supabase
      .from("parents")
      .select("id, name, site_id")
      .eq("id", parentId)
      .eq("site_id", siteId)
      .single();

    if (parentError || !parentData) {
      return NextResponse.json(
        { ok: false, error: "親御さんが見つかりません" },
        { status: 404 }
      );
    }

    // 2. 生徒が存在し、親子関係が正しいか確認
    const { data: parentStudent, error: relationError } = await supabase
      .from("parent_students")
      .select("parent_id, student_id")
      .eq("parent_id", parentId)
      .eq("student_id", studentId)
      .single();

    if (relationError || !parentStudent) {
      return NextResponse.json(
        { ok: false, error: "親子関係が見つかりません" },
        { status: 404 }
      );
    }

    // 3. 既存のLINEアカウント情報を確認（この親御さんに対して）
    const { data: existingAccount, error: checkError } = await supabase
      .from("parent_line_accounts")
      .select("id, line_user_id, is_active")
      .eq("parent_id", parentId)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116は「レコードが見つからない」エラーなので無視
      const errorMessage = checkError.message || String(checkError);
      return NextResponse.json(
        { ok: false, error: errorMessage },
        { status: 500 }
      );
    }

    // 4. 別の親御さんが同じLINEアカウントを使用していないか確認
    const { data: duplicateAccount, error: duplicateError } = await supabase
      .from("parent_line_accounts")
      .select("id, parent_id, parents!inner(name)")
      .eq("line_user_id", lineUserId)
      .neq("parent_id", parentId)
      .eq("is_active", true)
      .single();

    if (duplicateError && duplicateError.code !== "PGRST116") {
      const errorMessage = duplicateError.message || String(duplicateError);
      return NextResponse.json(
        { ok: false, error: errorMessage },
        { status: 500 }
      );
    }

    if (duplicateAccount) {
      const otherParentName = (duplicateAccount as any).parents?.name || "別の親御さん";
      return NextResponse.json(
        {
          ok: false,
          error: `このLINEアカウントは既に「${otherParentName}」に連携されています。1つのLINEアカウントは1人の親御さんにのみ紐付けできます。`,
        },
        { status: 409 }
      );
    }

    let alreadyConnected = false;

    if (existingAccount) {
      // 既存のアカウントがある場合

      if (existingAccount.line_user_id === lineUserId && existingAccount.is_active) {
        // 既に同じLINEアカウントで連携済み
        alreadyConnected = true;
        console.log(
          `[ParentLink] Already connected: parent=${parentId}, line_user=${lineUserId}`
        );
      } else {
        // 別のLINEアカウントまたは非アクティブの場合、更新
        const { error: updateError } = await supabase
          .from("parent_line_accounts")
          .update({
            line_user_id: lineUserId,
            line_display_name: lineDisplayName || null,
            is_active: true,
            subscribed_at: new Date().toISOString(),
            unsubscribed_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingAccount.id);

        if (updateError) {
          const errorMessage = updateError.message || String(updateError);
          console.error(`[ParentLink] Failed to update LINE account:`, errorMessage);
          return NextResponse.json(
            { ok: false, error: "LINE連携の更新に失敗しました" },
            { status: 500 }
          );
        }

        console.log(
          `[ParentLink] Updated LINE account: parent=${parentId}, line_user=${lineUserId}`
        );
      }
    } else {
      // 新規作成
      const { error: insertError } = await supabase
        .from("parent_line_accounts")
        .insert([
          {
            parent_id: parentId,
            line_user_id: lineUserId,
            line_display_name: lineDisplayName || null,
            is_active: true,
            subscribed_at: new Date().toISOString(),
          },
        ]);

      if (insertError) {
        const errorMessage = insertError.message || String(insertError);
        console.error(`[ParentLink] Failed to create LINE account:`, errorMessage);
        return NextResponse.json(
          { ok: false, error: "LINE連携の作成に失敗しました" },
          { status: 500 }
        );
      }

      console.log(
        `[ParentLink] Created LINE account: parent=${parentId}, line_user=${lineUserId}`
      );
    }

    // 5. 生徒情報を取得（レスポンス用）
    const { data: studentData } = await supabase
      .from("students")
      .select("name")
      .eq("id", studentId)
      .single();

    const studentName = studentData?.name || "お子様";

    return NextResponse.json({
      ok: true,
      message: alreadyConnected
        ? "既にLINE連携済みです"
        : `${parentData.name}様のLINEアカウントを${studentName}さんに連携しました`,
      alreadyConnected,
      parent: {
        id: parentData.id,
        name: parentData.name,
      },
      student: {
        id: studentId,
        name: studentName,
      },
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    console.error(`[ParentLink] Error:`, errorMessage);
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
