"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2, XCircle, Loader2, QrCode } from "lucide-react"
import { Html5Qrcode } from "html5-qrcode"

function LinkCardContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const cardIdFromUrl = searchParams.get("cardId") // URLパラメータからカードIDを取得

  const [status, setStatus] = useState<
    "idle" | "checking" | "ready" | "scanning" | "success" | "error"
  >("idle")
  const [error, setError] = useState<string | null>(null)
  const [isQrSupported, setIsQrSupported] = useState(true) // html5-qrcodeはほとんどのブラウザで動作
  const [isQrScanning, setIsQrScanning] = useState(false)
  const [qrError, setQrError] = useState<string | null>(null)
  const [manualCardId, setManualCardId] = useState("")
  const [studentName, setStudentName] = useState<string | null>(null)
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const qrAbortRef = useRef(false)

  useEffect(() => {
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

  // トークン検証後、URLパラメータにカードIDがある場合は自動的に紐づけを開始
  useEffect(() => {
    if (status === "ready" && cardIdFromUrl && token) {
      // カードIDがURLパラメータにある場合、自動的に紐づけを開始
      submitCardId(cardIdFromUrl).catch((e: any) => {
        setError(e?.message || "紐付けに失敗しました")
        setStatus("ready")
      })
    }
  }, [status, cardIdFromUrl, token])

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
      // URLパラメータからcardIdを取得
      const cardIdParam =
        url.searchParams.get("cardId") ||
        url.searchParams.get("card_id") ||
        url.searchParams.get("card")
      if (cardIdParam) {
        return cardIdParam.trim()
      }
      // URLパラメータがない場合、パスから取得を試みる
      // 例: /link-card-start?cardId=xxx のような形式
      const pathMatch = trimmed.match(/cardId[=:]([^&\s]+)/i)
      if (pathMatch && pathMatch[1]) {
        return decodeURIComponent(pathMatch[1]).trim()
      }
      // それでも見つからない場合、そのまま返す（カードIDが直接含まれている場合）
      return trimmed
    } catch {
      // URL形式でない場合、そのまま返す（カードIDが直接含まれている場合）
      return trimmed
    }
  }

  const stopQrScan = async () => {
    qrAbortRef.current = true
    setIsQrScanning(false)
    
    // html5-qrcodeの停止
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop()
        await html5QrCodeRef.current.clear()
      } catch (e) {
        console.error("Error stopping QR scanner:", e)
      }
      html5QrCodeRef.current = null
    }
    
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

    console.log("[LinkCard] Submitting card ID:", normalizedCardId.substring(0, 20) + "...")
    console.log("[LinkCard] Token:", token?.substring(0, 20) + "...")
    
    const res = await fetch("/api/line/link-card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: token,
        serialNumber: normalizedCardId,
      }),
    })

    const data = await res.json()
    console.log("[LinkCard] API response:", { ok: data?.ok, error: data?.error })

    if (!res.ok || !data?.ok) {
      const errorMessage = data?.error || "紐付けに失敗しました"
      console.error("[LinkCard] Link failed:", errorMessage)
      throw new Error(errorMessage)
    }

    setStudentName(data.student?.name || null)
    setStatus("success")
  }

  const startQrScan = async () => {
    const elementId = "qr-reader"
    const element = document.getElementById(elementId)
    
    if (!element) {
      setQrError("カメラの初期化に失敗しました")
      return
    }

    try {
      setQrError(null)
      setIsQrScanning(true)
      qrAbortRef.current = false

      // html5-qrcodeを使用
      const html5QrCode = new Html5Qrcode(elementId)
      html5QrCodeRef.current = html5QrCode

      // カメラIDを取得（背面カメラを優先）
      // まず、getUserMediaで環境カメラ（背面カメラ）を直接取得してカメラIDを特定
      let cameraId: string | null = null
      
      try {
        // 環境カメラ（背面カメラ）を直接取得
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        })
        const tracks = stream.getVideoTracks()
        if (tracks.length > 0) {
          const settings = tracks[0].getSettings()
          if (settings.deviceId) {
            cameraId = settings.deviceId as string
            console.log("[QRScan] Found environment camera via getUserMedia:", cameraId)
          }
        }
        // ストリームを停止（後でhtml5-qrcodeが再取得する）
        tracks.forEach(track => track.stop())
      } catch (e) {
        console.warn("[QRScan] Failed to get environment camera directly:", e)
      }
      
      // 直接取得に失敗した場合、カメラリストから検索
      if (!cameraId) {
        const devices = await Html5Qrcode.getCameras()
        console.log("[QRScan] Available cameras:", devices.map(d => ({ id: d.id.substring(0, 20) + "...", label: d.label })))
        
        // 背面カメラを探す
        for (const device of devices) {
          const label = device.label.toLowerCase()
          if (label.includes("back") || 
              label.includes("rear") ||
              label.includes("環境") ||
              label.includes("後") ||
              label.includes("environment") ||
              label.includes("facing back")) {
            cameraId = device.id
            console.log("[QRScan] Found back camera from list:", device.label)
            break
          }
        }
        
        // 背面カメラが見つからない場合、デバイス数が2つ以上なら2番目を試す（iPhoneの場合、最初が前面、2番目が背面の可能性）
        if (!cameraId && devices.length >= 2) {
          cameraId = devices[1].id
          console.log("[QRScan] Using second camera (likely back camera):", devices[1].label)
        } else if (!cameraId && devices.length > 0) {
          cameraId = devices[0].id
          console.log("[QRScan] Using first camera:", devices[0].label)
        }
      }

      if (!cameraId) {
        throw new Error("カメラが見つかりませんでした")
      }

      // QRコードスキャンを開始
      // 読み取り枠を大きく、画面サイズに応じて調整
      const qrboxSize = Math.min(300, Math.min(window.innerWidth, window.innerHeight) * 0.7)
      console.log("[QRScan] Starting QR scan with camera:", cameraId?.substring(0, 20) + "...", "qrbox size:", qrboxSize)
      
      await html5QrCode.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: qrboxSize, height: qrboxSize },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText) => {
          // QRコードが検出された
          const extracted = extractCardIdFromQrValue(decodedText)
          if (extracted) {
            stopQrScan()
            submitCardId(extracted).catch((submitError: any) => {
              setError(submitError?.message || "紐付けに失敗しました")
              setStatus("ready")
            })
          }
        },
        (errorMessage) => {
          // エラーは無視（継続的にスキャンするため）
          // ただし、重大なエラーの場合は表示
          if (errorMessage.includes("Permission denied") || 
              errorMessage.includes("NotAllowedError") ||
              errorMessage.includes("NotReadableError")) {
            setQrError("カメラの使用許可が必要です。ブラウザの設定でカメラの許可を確認してください。")
            stopQrScan()
          }
        }
      )
    } catch (e: any) {
      console.error("QR scan error:", e)
      let errorMessage = "QR読み取りの開始に失敗しました"
      
      if (e?.name === "NotAllowedError" || 
          e?.message?.includes("Permission denied") ||
          e?.message?.includes("permission") ||
          e?.message?.includes("NotAllowedError")) {
        errorMessage = "カメラの使用許可が必要です。\n\n設定方法:\n1. ブラウザの設定を開く\n2. サイトの設定 → カメラ → 許可\n3. ページを再読み込みしてください"
      } else if (e?.name === "NotFoundError" || 
                 e?.message?.includes("camera") ||
                 e?.message?.includes("カメラ") ||
                 e?.message?.includes("NotFoundError")) {
        errorMessage = "カメラが見つかりませんでした。"
      } else if (e?.message) {
        errorMessage = e.message
      }
      
      setQrError(errorMessage)
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
          {cardIdFromUrl && (
            <Alert>
              <AlertDescription>
                <p className="font-medium mb-2">カードIDが検出されました</p>
                <p className="text-sm text-muted-foreground">
                  自動的に紐づけを開始します...
                </p>
              </AlertDescription>
            </Alert>
          )}
          {/* QRコード読み取りセクション */}
          <div className="space-y-3">
            <div className="overflow-hidden rounded-md border bg-black">
              <div
                id="qr-reader"
                className="w-full"
                style={{ minHeight: "300px", height: "50vh", maxHeight: "500px" }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={startQrScan}
                variant="default"
                className="flex-1"
                disabled={isQrScanning}
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
