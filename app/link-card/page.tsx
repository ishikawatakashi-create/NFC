"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2, XCircle, Loader2, Smartphone, QrCode } from "lucide-react"

export default function LinkCardPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<
    "idle" | "checking" | "ready" | "scanning" | "success" | "error"
  >("idle")
  const [error, setError] = useState<string | null>(null)
  const [isNfcSupported, setIsNfcSupported] = useState(false)
  const [isQrSupported, setIsQrSupported] = useState(false)
  const [isQrMode, setIsQrMode] = useState(false)
  const [isQrScanning, setIsQrScanning] = useState(false)
  const [qrError, setQrError] = useState<string | null>(null)
  const [manualCardId, setManualCardId] = useState("")
  const [studentName, setStudentName] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const qrAbortRef = useRef(false)

  useEffect(() => {
    // NFCサポートチェック
    // @ts-ignore - Web NFC API
    if (typeof window !== "undefined" && "NDEFReader" in window) {
      setIsNfcSupported(true)
    }
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

  const handleToggleQrMode = () => {
    if (isQrMode) {
      stopQrScan()
      setIsQrMode(false)
      return
    }
    setIsQrMode(true)
    setQrError(null)
    startQrScan()
  }

  const handleScan = async () => {
    if (!isNfcSupported) {
      setError("このデバイスはNFCをサポートしていません。スマートフォンでアクセスしてください。")
      setStatus("ready")
      return
    }

    if (!token) {
      setError("トークンが指定されていません")
      setStatus("error")
      return
    }

    setStatus("scanning")
    setError(null)

    try {
      // @ts-ignore - Web NFC API
      const ndef = new NDEFReader()

      let isProcessing = false

      const processCard = async (serialNumber: string) => {
        if (isProcessing) return
        isProcessing = true

        try {
          if (!serialNumber) {
            throw new Error("カードのシリアル番号を読み取れませんでした")
          }

          // シリアル番号の正規化
          const cardSerial = serialNumber.trim().toLowerCase()

          await submitCardId(cardSerial)
        } catch (e: any) {
          setError(e?.message || "カードの読み取りに失敗しました")
          setStatus("ready")
        }
      }

      // reading イベント（NDEF対応カード）
      ndef.addEventListener("reading", async (event: any) => {
        const { serialNumber } = event
        await processCard(serialNumber)
      })

      // readingerror イベント（NDEF非対応カード）
      ndef.addEventListener("readingerror", async (event: any) => {
        console.error("Reading error:", event)
        setError("カードの読み取りに失敗しました。NDEF対応のカードを使用してください。")
        setStatus("error")
      })

      // 読み取り開始
      await ndef.scan()
    } catch (e: any) {
      setError(e?.message || "NFC読み取りの開始に失敗しました")
      setStatus("error")
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
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>NFCカードを紐付け</CardTitle>
          <CardDescription>
            お子様のNFCカードをスマートフォンにタッチしてください
            <br />
            iPhoneの方は下の「QRコードで登録」をご利用ください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isNfcSupported && (
            <Alert variant="warning">
              <AlertDescription>
                このデバイスはNFCをサポートしていません。スマートフォンでアクセスしてください。
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {status === "scanning" ? (
                <>
                  <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                  カードを読み取り中...
                  <br />
                  <span className="text-xs">NFCカードをスマートフォンに近づけてください</span>
                </>
              ) : (
                "下のボタンを押してから、お子様のNFCカードをスマートフォンにタッチしてください。"
              )}
            </p>
          </div>

          <Button
            onClick={handleScan}
            disabled={!isNfcSupported || status === "scanning"}
            className="w-full"
            size="lg"
          >
            {status === "scanning" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                読み取り中...
              </>
            ) : (
              "NFCカードを読み取る"
            )}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="pt-4 border-t space-y-3">
            <p className="text-xs text-muted-foreground text-center">
              タッチでうまく設定できない方はこちら
            </p>
            <Button
              onClick={handleToggleQrMode}
              variant="outline"
              className="w-full"
            >
              <QrCode className="mr-2 h-4 w-4" />
              {isQrMode ? "QR登録を閉じる" : "QRコードで登録"}
            </Button>
            {isQrMode && (
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
                    variant="secondary"
                    className="flex-1"
                    disabled={!isQrSupported || isQrScanning}
                  >
                    {isQrScanning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        読み取り中...
                      </>
                    ) : (
                      "QR読み取りを開始"
                    )}
                  </Button>
                  <Button
                    onClick={stopQrScan}
                    variant="outline"
                    className="flex-1"
                    disabled={!isQrScanning}
                  >
                    停止
                  </Button>
                </div>
                {qrError && (
                  <Alert variant="destructive">
                    <AlertDescription>{qrError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="manualCardId" className="text-xs">
                    QRが使えない場合はカードIDを入力
                  </Label>
                  <Input
                    id="manualCardId"
                    value={manualCardId}
                    onChange={(e) => setManualCardId(e.target.value)}
                    placeholder="例: 04:e9:41:50:6f:61:80"
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
              </div>
            )}
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              ※このページは1時間有効です
              <br />
              ※NDEF対応のNFCカードのみ読み取り可能です
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
