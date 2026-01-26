import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * サーバ側専用のSupabaseクライアント（Service Role Key使用）
 * クライアント側では絶対に使用しないこと
 */
export function getSupabaseAdmin() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}









