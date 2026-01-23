import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth-helpers";

/**
 * GET /api/admin/info
 * 現在の管理者情報を取得
 */
export async function GET() {
  try {
    const { admin, response } = await requireAdminApi();
    if (!admin) {
      return response;
    }

    return NextResponse.json({
      ok: true,
      admin: {
        firstName: admin.firstName,
        lastName: admin.lastName,
      },
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}









