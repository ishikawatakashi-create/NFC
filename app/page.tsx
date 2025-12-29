import { getCurrentAdmin } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

/**
 * トップページ
 * 認証状態に応じて適切なページにリダイレクト
 */
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const admin = await getCurrentAdmin();

  // 認証済みの場合は管理画面の生徒管理ページへ
  if (admin) {
    redirect("/admin/students");
  }

  // 未認証の場合はログインページへ
  redirect("/admin/login");
}
