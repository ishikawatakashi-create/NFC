"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Loader2, CreditCard } from "lucide-react"

export default function KioskExitPage() {
  const [isScanning, setIsScanning] = useState(false)
  const [lastResult, setLastResult] = useState<{
    success: boolean
    studentName?: string
    cardId?: string
    message: string
    timestamp?: string
  } | null>(null)
  const [isNfcSupported, setIsNfcSupported] = useState(false)

  useEffect(() => {
    // Web NFC APIのサポート確認
    if ("NDEFReader" in window) {
      setIsNfcSupported(true)
    } else {
      setIsNfcSupported(false)
    }
  }, [])

  const formatDateTime = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    const seconds = String(date.getSeconds()).padStart(2, "0")
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  const handleScan = async () => {
    if (!isNfcSupported) {
      alert("このデバイスはNFCをサポートしていません。")
      return
    }

    setIsScanning(true)
    setLastResult(null)

    try {
      // @ts-ignore - Web NFC API
      const ndef = new NDEFReader()

      await ndef.scan()

      ndef.addEventListener("reading", async (event: any) => {
        try {
          const { message, serialNumber } = event

          // NDEFメッセージからトークンを読み取る
          let token: string | null = null
          
          if (message && message.records && message.records.length > 0) {
            for (const record of message.records) {
              if (record.recordType === "text") {
                const textDecoder = new TextDecoder(record.encoding || "utf-8")
                const text = textDecoder.decode(record.data)
                // "iru:card:" で始まるトークンを探す
                if (text.startsWith("iru:card:")) {
                  token = text
                  break
                }
              }
            }
          }

          if (!token) {
            setLastResult({
              success: false,
              message: "カードに有効なトークンが書き込まれていません。管理画面でカード登録を行ってください。",
              timestamp: formatDateTime(new Date()),
            })
            setIsScanning(false)
            return
          }

          // トークンから生徒を検索
          const verifyRes = await fetch("/api/cards/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          })
          const verifyData = await verifyRes.json()

          if (!verifyRes.ok || !verifyData?.ok) {
            setLastResult({
              success: false,
              message: verifyData?.error || "カードの検証に失敗しました。",
              timestamp: formatDateTime(new Date()),
            })
            setIsScanning(false)
            return
          }

          const student = verifyData.student
          const studentId = student.id
          const studentName = student.name

          // 退室イベントを記録
          const logRes = await fetch("/api/access-logs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentId,
              cardId: token, // トークンを記録
              deviceId: "kiosk-exit", // 端末IDとして固定値を使用
              eventType: "exit",
              notificationStatus: "not_required", // 退室時は通知不要とする
            }),
          })

          const logData = await logRes.json()

          if (logRes.ok && logData?.ok) {
            setLastResult({
              success: true,
              studentName,
              cardId: `...${token.slice(-8)}`, // トークン末尾8文字のみ表示
              message: `${studentName}さんの退室を記録しました。`,
              timestamp: formatDateTime(new Date()),
            })
          } else {
            setLastResult({
              success: false,
              studentName,
              cardId: `...${token.slice(-8)}`,
              message: logData?.error || "ログの記録に失敗しました。",
              timestamp: formatDateTime(new Date()),
            })
          }
        } catch (error: any) {
          setLastResult({
            success: false,
            message: error?.message || "エラーが発生しました。",
            timestamp: formatDateTime(new Date()),
          })
        } finally {
          setIsScanning(false)
        }
      })

      // タイムアウト設定（10秒）
      setTimeout(() => {
        if (isScanning) {
          setIsScanning(false)
          setLastResult({
            success: false,
            message: "タイムアウトしました。カードを再度タッチしてください。",
            timestamp: formatDateTime(new Date()),
          })
        }
      }, 10000)
    } catch (error: any) {
      setIsScanning(false)
      setLastResult({
        success: false,
        message: error?.message || "NFC読み取りに失敗しました。",
        timestamp: formatDateTime(new Date()),
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">出口側</CardTitle>
          <p className="text-muted-foreground mt-2">NFCカードをタッチして退室を記録してください</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isNfcSupported && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                このデバイスはNFCをサポートしていません。NFC対応デバイスでアクセスしてください。
              </p>
            </div>
          )}

          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                {isScanning ? (
                  <Loader2 className="w-16 h-16 text-orange-600 dark:text-orange-400 animate-spin" />
                ) : (
                  <CreditCard className="w-16 h-16 text-orange-600 dark:text-orange-400" />
                )}
              </div>
            </div>

            <Button
              onClick={handleScan}
              disabled={isScanning || !isNfcSupported}
              size="lg"
              className="w-full max-w-xs"
            >
              {isScanning ? "読み取り中..." : "カードをタッチ"}
            </Button>
          </div>

          {lastResult && (
            <div className="mt-6">
              <Card className={lastResult.success ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"}>
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-4">
                    {lastResult.success ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
                    )}
                    <div className="flex-1 space-y-2">
                      <p className={`font-semibold ${lastResult.success ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"}`}>
                        {lastResult.message}
                      </p>
                      {lastResult.studentName && (
                        <p className="text-sm text-muted-foreground">
                          生徒名: <span className="font-medium">{lastResult.studentName}</span>
                        </p>
                      )}
                      {lastResult.cardId && (
                        <p className="text-sm text-muted-foreground">
                          トークン: <span className="font-mono">{lastResult.cardId}</span>
                        </p>
                      )}
                      {lastResult.timestamp && (
                        <p className="text-sm text-muted-foreground">
                          時刻: <span className="font-mono">{lastResult.timestamp}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

