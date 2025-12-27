"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createBrowserSupabaseClient } from "@/lib/supabase-client-auth"
import { AlertCircle, Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return "パスワードは8文字以上である必要があります"
    }
    if (!/[a-z]/.test(pwd)) {
      return "パスワードに小文字を含める必要があります"
    }
    if (!/[A-Z]/.test(pwd)) {
      return "パスワードに大文字を含める必要があります"
    }
    if (!/[0-9]/.test(pwd)) {
      return "パスワードに数字を含める必要があります"
    }
    return null
  }

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

    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
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

      // ログイン成功 - 管理画面にリダイレクト
      window.location.href = "/admin/students"
    } catch (err: any) {
      setError(err?.message || "予期しないエラーが発生しました")
      setIsLoading(false)
    }
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
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

