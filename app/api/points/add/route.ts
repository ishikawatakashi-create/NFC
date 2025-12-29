import { NextResponse } from "next/server";
import { addPoints } from "@/lib/point-utils";

// 管理画面からのポイント追加
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentId, points, description } = body as {
      studentId: string;
      points: number;
      description?: string;
    };

    const siteId = process.env.SITE_ID;

    if (!siteId) {
      return NextResponse.json(
        { ok: false, error: "SITE_ID が .env.local に設定されていません" },
        { status: 500 }
      );
    }

    if (!studentId) {
      return NextResponse.json({ ok: false, error: "studentId は必須です" }, { status: 400 });
    }

    if (!points || points <= 0) {
      return NextResponse.json(
        { ok: false, error: "points は1以上の数値である必要があります" },
        { status: 400 }
      );
    }

    const success = await addPoints(
      siteId,
      studentId,
      points,
      "admin_add",
      description || "管理画面からのポイント追加"
    );

    if (!success) {
      return NextResponse.json(
        { ok: false, error: "ポイントの追加に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `${points}ポイントを追加しました`,
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}


