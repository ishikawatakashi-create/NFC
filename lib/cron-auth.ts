import { NextResponse } from "next/server";
import { env } from "@/lib/env";

type CronAuthResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

export function requireCronSecret(req: Request): CronAuthResult {
  const vercelCronHeader = req.headers.get("x-vercel-cron");
  if (vercelCronHeader) {
    return { ok: true };
  }

  const secret = env.CRON_API_SECRET;
  if (!secret) {
    return { ok: true };
  }

  const provided = req.headers.get("x-cron-secret");
  if (!provided || provided !== secret) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "認証に失敗しました" },
        { status: 401 }
      ),
    };
  }

  return { ok: true };
}
