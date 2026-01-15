"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createBrowserSupabaseClient } from "@/lib/supabase-client-auth"
import { AlertCircle, Loader2, Key } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    // バリデーション
    if (!email) {
      setError("メールアドレスを入力してください")
      setIsLoading(false)
      return
    }

    if (!password) {
      setError("パスワードを入力してください")
      setIsLoading(false)
      return
    }

    try {
      const supabase = createBrowserSupabaseClient()

      // ログイン
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message || "ログインに失敗しました")
        setIsLoading(false)
        return
      }

      if (!data.user) {
        setError("ログインに失敗しました")
        setIsLoading(false)
        return
      }

      // 管理者情報を確認（API経由で確認）
      const checkRes = await fetch("/api/admin/check", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      if (!checkRes.ok) {
        const checkData = await checkRes.json()
        setError(checkData?.error || "管理者として登録されていません")
        setIsLoading(false)
        // ログアウト
        await supabase.auth.signOut()
        return
      }

      // セッションが確立されるまで少し待つ
      await new Promise((resolve) => setTimeout(resolve, 100))

      // ログイン成功 - 管理画面のリンク一覧にリダイレクト
      window.location.href = "/admin/links"
    } catch (err: any) {
      setError(err?.message || "予期しないエラーが発生しました")
      setIsLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      setResetError("メールアドレスを入力してください")
      return
    }

    setIsResettingPassword(true)
    setResetError(null)
    setResetSuccess(false)

    try {
      const supabase = createBrowserSupabaseClient()
      
      // 本番環境のURLを取得
      // window.location.originを使用（Vercelでは自動的に正しいURLになる）
      // フォールバックとして環境変数または固定URLを使用
      const appUrl = 
        (typeof window !== 'undefined' ? window.location.origin : null) ||
        (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_APP_URL : null) ||
        'https://nfctoukalab.vercel.app'
      // コールバックルート経由でリセットページにリダイレクト
      const redirectTo = `${appUrl}/auth/callback?next=/admin/reset-password`
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: redirectTo,
      })

      if (resetError) {
        setResetError(resetError.message || "パスワードリセットメールの送信に失敗しました")
        setIsResettingPassword(false)
        return
      }

      setResetSuccess(true)
      setIsResettingPassword(false)
    } catch (err: any) {
      setResetError(err?.message || "予期しないエラーが発生しました")
      setIsResettingPassword(false)
    }
  }

  const handleOpenPasswordResetDialog = () => {
    setResetEmail(email) // ログイン画面で入力したメールアドレスを初期値に
    setResetError(null)
    setResetSuccess(false)
    setIsPasswordResetDialogOpen(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">管理者ログイン</CardTitle>
          <CardDescription className="text-center">
            メールアドレスとパスワードでログインしてください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                placeholder="パスワードを入力"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
              <p className="text-xs text-muted-foreground">
                パスワード要件: 8文字以上、大文字・小文字・数字を含む必要があります
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ログイン中...
                </>
              ) : (
                "ログイン"
              )}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                className="text-sm text-muted-foreground"
                onClick={handleOpenPasswordResetDialog}
                disabled={isLoading}
              >
                <Key className="mr-2 h-4 w-4" />
                パスワードを忘れた場合
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* パスワードリセットダイアログ */}
      <Dialog open={isPasswordResetDialogOpen} onOpenChange={setIsPasswordResetDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>パスワード再設定</DialogTitle>
            <DialogDescription>
              登録されているメールアドレスを入力してください。
              <br />
              パスワードリセット用のリンクをメールでお送りします。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {resetSuccess ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  パスワードリセット用のメールを送信しました。
                  <br />
                  メール内のリンクをクリックして、新しいパスワードを設定してください。
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {resetError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{resetError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="reset-email">メールアドレス</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="admin@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    disabled={isResettingPassword}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            {resetSuccess ? (
              <Button onClick={() => setIsPasswordResetDialogOpen(false)}>
                閉じる
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsPasswordResetDialogOpen(false)}
                  disabled={isResettingPassword}
                >
                  キャンセル
                </Button>
                <Button onClick={handlePasswordReset} disabled={isResettingPassword}>
                  {isResettingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      送信中...
                    </>
                  ) : (
                    "送信"
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

