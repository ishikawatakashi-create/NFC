import { NextResponse } from "next/server";
import { consumePoints } from "@/lib/point-utils";

// ポイント消費
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

    const result = await consumePoints(siteId, studentId, points, description);

    if (!result.success) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: `${points}ポイントを消費しました`,
    });
  } catch (e: any) {
    const errorMessage = e?.message || String(e) || "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}


