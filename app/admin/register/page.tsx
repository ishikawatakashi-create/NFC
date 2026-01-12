"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react"

export default function AdminRegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [employmentType, setEmploymentType] = useState<"part_time" | "full_time" | "">("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
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
    setSuccess(false)
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

    if (!firstName) {
      setError("名前を入力してください")
      setIsLoading(false)
      return
    }

    if (!lastName) {
      setError("苗字を入力してください")
      setIsLoading(false)
      return
    }

    if (!employmentType) {
      setError("雇用形態を選択してください")
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch("/api/admin/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          employmentType,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        setError(data?.error || "管理者登録に失敗しました")
        setIsLoading(false)
        return
      }

      setSuccess(true)
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">初回管理者登録</CardTitle>
          <CardDescription className="text-center">
            管理者アカウントを作成してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  管理者が正常に登録されました。3秒後にログインページにリダイレクトします。
                </AlertDescription>
              </Alert>
              <Button
                className="w-full"
                onClick={() => router.push("/admin/login")}
              >
                ログインページへ
              </Button>
            </div>
          ) : (
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lastName">苗字</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="山田"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="firstName">名前</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="太郎"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employmentType">雇用形態</Label>
                <Select
                  value={employmentType}
                  onValueChange={(value) => setEmploymentType(value as "part_time" | "full_time")}
                  disabled={isLoading}
                  required
                >
                  <SelectTrigger id="employmentType">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="part_time">アルバイト</SelectItem>
                    <SelectItem value="full_time">正社員</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登録中...
                  </>
                ) : (
                  "管理者を登録"
                )}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  className="text-sm"
                  onClick={() => router.push("/admin/login")}
                >
                  既にアカウントをお持ちの方はログイン
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}









