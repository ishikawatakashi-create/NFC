import { getCurrentAdmin } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

/**
 * トップページ
 * 認証状態に応じて適切なページにリダイレクト
 */
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  try {
    const admin = await getCurrentAdmin();

    // 認証済みの場合は管理画面のリンク一覧へ
    if (admin) {
      redirect("/admin/links");
    }
  } catch (error) {
    // エラーが発生した場合はログインページへリダイレクト
    console.error("Error checking admin authentication:", error);
  }

  // 未認証の場合はログインページへ
  redirect("/admin/login");
}
