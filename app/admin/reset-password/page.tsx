"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createBrowserSupabaseClient } from "@/lib/supabase-client-auth"
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react"

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isVerifyingCode, setIsVerifyingCode] = useState(true)
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])

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

    if (isVerifyingCode) {
      setError("リセットリンクを確認中です。少し待ってから再度お試しください。")
      return
    }

    // バリデーション
    if (!password) {
      setError("パスワードを入力してください")
      return
    }

    if (password !== confirmPassword) {
      setError("パスワードが一致しません")
      return
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    setIsLoading(true)

    try {
      // パスワードを更新
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        setError(updateError.message || "パスワードの更新に失敗しました")
        setIsLoading(false)
        return
      }

      setIsSuccess(true)
      setIsLoading(false)

      // 3秒後にログインページにリダイレクト
      setTimeout(() => {
        router.push("/admin/login")
      }, 3000)
    } catch (err: any) {
      setError(err?.message || "予期しないエラーが発生しました")
      setIsLoading(false)
    }
  }

  useEffect(() => {
    async function verifyCode() {
      const code = searchParams.get("code")
      const type = searchParams.get("type")

      if (!code) {
        setError("無効なリセットリンクです")
        setIsVerifyingCode(false)
        return
      }

      // 1. まずPKCEフローでセッションを取得
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      if (!exchangeError) {
        setIsVerifyingCode(false)
        return
      }

      // 2. PKCEのコード検証がない場合はOTP方式でフォールバック
      if (exchangeError.message?.includes("PKCE code verifier not found") && type === "recovery") {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: code,
        })

        if (!verifyError) {
          setIsVerifyingCode(false)
          return
        }

        setError(verifyError.message || "リセットリンクの確認に失敗しました")
        setIsVerifyingCode(false)
        return
      }

      // その他のエラー
      setError(exchangeError.message || "リセットリンクの確認に失敗しました")
      setIsVerifyingCode(false)
    }

    verifyCode()
  }, [searchParams, supabase])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">パスワード再設定</CardTitle>
          <CardDescription className="text-center">
            新しいパスワードを入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                パスワードが正常に更新されました。
                <br />
                3秒後にログインページにリダイレクトします。
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">新しいパスワード</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="新しいパスワードを入力"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  パスワード要件: 8文字以上、大文字・小文字・数字を含む必要があります
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">パスワード（確認）</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="パスワードを再度入力"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    更新中...
                  </>
                ) : (
                  "パスワードを更新"
                )}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  className="text-sm text-muted-foreground"
                  onClick={() => router.push("/admin/login")}
                  disabled={isLoading}
                >
                  ログインページに戻る
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">読み込み中...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
