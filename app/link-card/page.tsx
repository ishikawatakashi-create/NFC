"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2, XCircle, Loader2, QrCode } from "lucide-react"

function LinkCardContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<
    "idle" | "checking" | "ready" | "scanning" | "success" | "error"
  >("idle")
  const [error, setError] = useState<string | null>(null)
  const [isQrSupported, setIsQrSupported] = useState(false)
  const [isQrScanning, setIsQrScanning] = useState(false)
  const [qrError, setQrError] = useState<string | null>(null)
  const [manualCardId, setManualCardId] = useState("")
  const [studentName, setStudentName] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const qrAbortRef = useRef(false)

  useEffect(() => {
    // QRコード読み取りサポートチェック
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      setIsQrSupported(true)
    }

    // トークンの検証
    if (token) {
      checkToken()
    } else {
      setError("トークンが指定されていません")
      setStatus("error")
    }
    return () => {
      stopQrScan()
    }
  }, [token])

  const checkToken = async () => {
    setStatus("checking")
    setError(null)

    try {
      const res = await fetch(`/api/line/link-card?token=${token}`)
      const data = await res.json()

      if (!res.ok || !data?.ok) {
        setError(data?.error || "トークンの検証に失敗しました")
        setStatus("error")
        return
      }

      setStatus("ready")
    } catch (e: any) {
      setError(e?.message || "トークンの検証に失敗しました")
      setStatus("error")
    }
  }

  const extractCardIdFromQrValue = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return ""
    try {
      const url = new URL(trimmed)
      const cardIdParam =
        url.searchParams.get("cardId") ||
        url.searchParams.get("card_id") ||
        url.searchParams.get("card")
      return cardIdParam ? cardIdParam.trim() : trimmed
    } catch {
      return trimmed
    }
  }

  const stopQrScan = () => {
    qrAbortRef.current = true
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsQrScanning(false)
  }

  const submitCardId = async (cardId: string) => {
    if (!token) {
      setError("トークンが指定されていません")
      setStatus("error")
      return
    }

    const normalizedCardId = cardId.trim().toLowerCase()
    if (!normalizedCardId) {
      setError("カードIDを読み取れませんでした")
      setStatus("ready")
      return
    }

    const res = await fetch("/api/line/link-card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: token,
        serialNumber: normalizedCardId,
      }),
    })

    const data = await res.json()

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || "紐付けに失敗しました")
    }

    setStudentName(data.student?.name || null)
    setStatus("success")
  }

  const startQrScan = async () => {
    if (!isQrSupported) {
      setQrError("この端末はQR読み取りに対応していません。手入力をご利用ください。")
      return
    }

    try {
      setQrError(null)
      setIsQrScanning(true)
      qrAbortRef.current = false

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      })

      streamRef.current = stream

      if (!videoRef.current) {
        setQrError("カメラの初期化に失敗しました")
        stopQrScan()
        return
      }

      videoRef.current.srcObject = stream
      await videoRef.current.play()

      // @ts-ignore - BarcodeDetector API
      const detector = new BarcodeDetector({ formats: ["qr_code"] })

      const scanLoop = async () => {
        if (qrAbortRef.current || !videoRef.current) return
        try {
          const codes = await detector.detect(videoRef.current)
          if (codes && codes.length > 0) {
            const rawValue = codes[0].rawValue || ""
            const extracted = extractCardIdFromQrValue(rawValue)
            if (extracted) {
              stopQrScan()
              try {
                await submitCardId(extracted)
              } catch (submitError: any) {
                setError(submitError?.message || "紐付けに失敗しました")
                setStatus("ready")
              }
              return
            }
          }
        } catch (e) {
          console.error("QR detect failed:", e)
        }
        if (!qrAbortRef.current) {
          requestAnimationFrame(scanLoop)
        }
      }

      requestAnimationFrame(scanLoop)
    } catch (e: any) {
      setQrError(e?.message || "QR読み取りの開始に失敗しました")
      stopQrScan()
    }
  }

  const handleManualSubmit = async () => {
    setError(null)
    setQrError(null)
    try {
      await submitCardId(manualCardId)
    } catch (e: any) {
      setError(e?.message || "紐付けに失敗しました")
      setStatus("ready")
    }
  }


  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">トークンを確認中...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              エラー
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error || "エラーが発生しました"}</AlertDescription>
            </Alert>
            <Button onClick={checkToken} variant="outline" className="w-full">
              再試行
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              紐付け完了
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {studentName ? (
                  <>
                    <strong>{studentName}</strong>さんとの紐付けが完了しました。
                    <br />
                    これから入退室通知が届くようになります。
                  </>
                ) : (
                  "紐付けが完了しました。これから入退室通知が届くようになります。"
                )}
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground text-center">
              LINEに戻って確認してください。
            </p>
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
            <QrCode className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>カードを紐付け</CardTitle>
          <CardDescription>
            お子様のカードIDをQRコードで読み取るか、手動で入力してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* QRコード読み取りセクション */}
          <div className="space-y-3">
            <div className="overflow-hidden rounded-md border bg-black">
              <video
                ref={videoRef}
                className="h-48 w-full object-cover"
                playsInline
                muted
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={startQrScan}
                variant="default"
                className="flex-1"
                disabled={!isQrSupported || isQrScanning}
                size="lg"
              >
                {isQrScanning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    読み取り中...
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 h-4 w-4" />
                    QRコードを読み取る
                  </>
                )}
              </Button>
              {isQrScanning && (
                <Button
                  onClick={stopQrScan}
                  variant="outline"
                  className="flex-1"
                >
                  停止
                </Button>
              )}
            </div>
            {qrError && (
              <Alert variant="destructive">
                <AlertDescription>{qrError}</AlertDescription>
              </Alert>
            )}
            {!isQrSupported && (
              <Alert>
                <AlertDescription>
                  この端末はQR読み取りに対応していません。下の手動入力をご利用ください。
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* 区切り線 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">または</span>
            </div>
          </div>

          {/* 手動入力セクション */}
          <div className="space-y-2">
            <Label htmlFor="manualCardId">
              カードIDを手動で入力
            </Label>
            <Input
              id="manualCardId"
              value={manualCardId}
              onChange={(e) => setManualCardId(e.target.value)}
              placeholder="例: 04:e9:41:50:6f:61:80"
              onKeyDown={(e) => {
                if (e.key === "Enter" && manualCardId.trim()) {
                  handleManualSubmit()
                }
              }}
            />
            <Button
              onClick={handleManualSubmit}
              className="w-full"
              variant="secondary"
              disabled={!manualCardId.trim()}
            >
              入力したIDで登録
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              ※このページは1時間有効です
              <br />
              ※カードIDは管理画面で確認できます
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LinkCardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">読み込み中...</div>}>
      <LinkCardContent />
    </Suspense>
  )
}
