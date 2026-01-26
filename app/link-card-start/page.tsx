"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, MessageSquare, ExternalLink } from "lucide-react"

/**
 * 紐づけ開始ページのコンテンツ
 * QRコードを読み取った際に、LINE公式アカウントに遷移して「紐づけ」メッセージを送信する
 */
function LinkCardStartContent() {
  const searchParams = useSearchParams()
  const studentId = searchParams.get("studentId")
  const [lineOfficialAccountUrl, setLineOfficialAccountUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // LINE公式アカウントのURLを取得（環境変数から、またはデフォルト値）
    // LINE公式アカウントのURLは、LINE Developers Consoleで確認できます
    // 例: https://line.me/R/ti/p/@your-official-account-id
    const lineUrl = process.env.NEXT_PUBLIC_LINE_OFFICIAL_ACCOUNT_URL || null
    setLineOfficialAccountUrl(lineUrl)
    setIsLoading(false)
  }, [])

  const handleOpenLine = () => {
    if (lineOfficialAccountUrl) {
      // LINE公式アカウントに遷移
      window.location.href = lineOfficialAccountUrl
    } else {
      // LINE公式アカウントのURLが設定されていない場合、手動で「紐づけ」と送信してもらう
      alert("LINE公式アカウントを開いて、「紐づけ」とメッセージを送信してください。")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">読み込み中...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>LINE連携を開始</CardTitle>
          <CardDescription>
            LINE公式アカウントに「紐づけ」とメッセージを送信して、お子様のカードと紐づけを行ってください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <p className="font-medium mb-2">手順：</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>LINE公式アカウントを開きます</li>
                <li>「紐づけ」とメッセージを送信します</li>
                <li>返信されたURLをタップして、カードを読み取ります</li>
              </ol>
            </AlertDescription>
          </Alert>

          {lineOfficialAccountUrl ? (
            <Button onClick={handleOpenLine} className="w-full" size="lg">
              <MessageSquare className="h-4 w-4 mr-2" />
              LINE公式アカウントを開く
            </Button>
          ) : (
            <Alert variant="destructive">
              <AlertDescription>
                LINE公式アカウントのURLが設定されていません。
                <br />
                管理画面で設定するか、LINE公式アカウントを手動で開いて「紐づけ」とメッセージを送信してください。
              </AlertDescription>
            </Alert>
          )}

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              ※LINE公式アカウントと友だちになっていない場合は、先に友だち追加してください
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * 紐づけ開始ページ
 * Suspenseバウンダリでラップして、useSearchParams()を安全に使用
 */
export default function LinkCardStartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">読み込み中...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <LinkCardStartContent />
    </Suspense>
  )
}
