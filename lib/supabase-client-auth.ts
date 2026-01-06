import { createBrowserClient } from "@supabase/ssr";

/**
 * クライアント側で使用するSupabaseクライアント（セッション管理対応）
 * 'use client'コンポーネントで使用
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}







