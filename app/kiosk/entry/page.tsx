"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Loader2, CreditCard, Smartphone, ArrowDown, RotateCw } from "lucide-react"
import { createKioskHeaders } from "@/lib/kiosk-client"
import { NFC_CONSTANTS } from "@/lib/constants"

export default function KioskEntryPage() {
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

      let isProcessing = false // 重複処理を防ぐフラグ

      // カード処理の共通ハンドラ（イベントリスナーの前に定義）
      const processCard = async (serialNumber: string) => {
        if (isProcessing) return
        isProcessing = true
        console.log("Card detected! Serial:", serialNumber)

        try {
          // シリアル番号の確認
          if (!serialNumber) {
            setLastResult({
              success: false,
              message: "カードのシリアル番号を読み取れませんでした。",
              timestamp: formatDateTime(new Date()),
            })
            setIsScanning(false)
            return
          }

          // シリアル番号の正規化（小文字に統一、前後の空白を削除）
          const cardSerial = serialNumber.trim().toLowerCase()

          // シリアル番号から生徒を検索
          const verifyRes = await fetch("/api/cards/verify", {
            method: "POST",
            headers: createKioskHeaders(),
            body: JSON.stringify({ serialNumber: cardSerial }),
          })
          const verifyData = await verifyRes.json()

          if (!verifyRes.ok || !verifyData?.ok) {
            setLastResult({
              success: false,
              message: verifyData?.error || "このカードは登録されていません。管理画面でカード登録を行ってください。",
              cardId: cardSerial,
              timestamp: formatDateTime(new Date()),
            })
            setIsScanning(false)
            return
          }

          const student = verifyData.student
          const studentId = student.id
          const studentName = student.name

          // 入室イベントを記録
          const logRes = await fetch("/api/access-logs", {
            method: "POST",
            headers: createKioskHeaders(),
            body: JSON.stringify({
              studentId,
              cardId: cardSerial,
              deviceId: "kiosk-entry",
              eventType: "entry",
              notificationStatus: "not_required",
            }),
          })

          const logData = await logRes.json()

          if (logRes.ok && logData?.ok) {
            setLastResult({
              success: true,
              studentName,
              cardId: cardSerial,
              message: `${studentName}さんの入室を記録しました。`,
              timestamp: formatDateTime(new Date()),
            })
          } else {
            setLastResult({
              success: false,
              studentName,
              cardId: cardSerial,
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
      }

      // イベントリスナーを先に登録（scan()の前に登録することで確実にイベントをキャッチ）
      // reading イベント（NDEF対応カード）
      // Androidの実装によっては、readingイベントでもシリアル番号が取得できる場合がある
      ndef.addEventListener("reading", async (event: any) => {
        console.log("Reading event (NDEF supported):", event)
        console.log("Event keys:", Object.keys(event))
        
        // serialNumberを取得（複数の方法を試す）
        // Androidの実装によっては、serialNumberが別のプロパティ名で提供される場合がある
        let serialNumber = event.serialNumber || 
                          event.message?.serialNumber || 
                          event.uid ||
                          event.id ||
                          event.cardId ||
                          null
        
        if (serialNumber) {
          console.log("Serial number from reading event:", serialNumber)
          await processCard(serialNumber)
        } else {
          console.log("No serial number in reading event, waiting for readingerror event...")
          // readingイベントでシリアル番号が取得できない場合は、
          // readingerrorイベントで処理される
        }
      })

      // readingerror イベント（NDEF非対応カード: Suica, マイナンバーカード等）
      ndef.addEventListener("readingerror", async (event: any) => {
        console.log("Reading error (NDEF not supported):", event)
        console.log("Event keys:", Object.keys(event))
        console.log("Event serialNumber:", event.serialNumber)
        console.log("Event message:", event.message)
        console.log("Event toString:", event.toString())
        
        // serialNumberを取得（複数の方法を試す）
        // Androidの実装によっては、serialNumberが別のプロパティ名で提供される場合がある
        let serialNumber = event.serialNumber || 
                          event.message?.serialNumber || 
                          event.uid ||
                          event.id ||
                          event.cardId ||
                          null
        
        // イベントオブジェクト全体を文字列化して確認
        if (!serialNumber) {
          console.log("Full event object:", JSON.stringify(event, null, 2))
          // イベントのすべてのプロパティを確認
          for (const key in event) {
            console.log(`Event[${key}]:`, event[key])
          }
        }
        
        if (serialNumber) {
          console.log("Serial number found:", serialNumber)
          await processCard(serialNumber)
        } else {
          console.error("Serial number not found in readingerror event")
          console.error("Event object:", event)
          console.error("Available properties:", Object.keys(event))
          
          // デバッグ情報を画面に表示
          const debugInfo = `イベントプロパティ: ${Object.keys(event).join(", ")}\n` +
            `event.serialNumber: ${event.serialNumber}\n` +
            `event.message: ${event.message}\n` +
            `event.toString(): ${event.toString()}\n` +
            `イベント全体: ${JSON.stringify(event, null, 2)}`
          
          console.error("Debug info:", debugInfo)
          
          setLastResult({
            success: false,
            message: "このカード（Suica等のFeliCaカード）は、Web NFC APIではシリアル番号を取得できません。\n\n" +
              "【解決方法】\n" +
              "1. NFC Toolsアプリでカードのシリアル番号を取得\n" +
              "2. 管理画面で「手動で入力」からシリアル番号を登録\n" +
              "3. 登録後、この画面でカードをタッチしてください\n\n" +
              "※ 本番環境では、NTAG213等のNDEF対応カードの使用を推奨します。",
            timestamp: formatDateTime(new Date()),
          })
          setIsScanning(false)
        }
      })

      await ndef.scan()
      console.log("NFC scan started, waiting for card...")

      // タイムアウト設定
      setTimeout(() => {
        if (isScanning) {
          setIsScanning(false)
          setLastResult({
            success: false,
            message: "タイムアウトしました。カードを再度タッチしてください。",
            timestamp: formatDateTime(new Date()),
          })
        }
      }, NFC_CONSTANTS.SCAN_TIMEOUT)
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">入口側</CardTitle>
          <p className="text-muted-foreground mt-2">NFCカードをタッチして入室を記録してください</p>
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
            {isScanning ? (
              // 読み取り中: 背面タッチガイドを表示
              <div className="flex flex-col items-center justify-center space-y-6 w-full">
                <div className="relative">
                  {/* 端末の背面を示すアイコン */}
                  <div className="flex flex-col items-center space-y-2">
                    <div className="relative">
                      <Smartphone className="w-24 h-24 text-blue-600 dark:text-blue-400" />
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                        <ArrowDown className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-bounce" />
                      </div>
                    </div>
                    {/* カードアイコン（表側を見せながら背面に当てる様子） */}
                    <div className="relative mt-4">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                        <RotateCw className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" style={{ animationDuration: '2s' }} />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4 w-full max-w-md">
                  <p className="text-center font-semibold text-blue-900 dark:text-blue-100 text-lg mb-2">
                    端末の背面にカードを当ててください
                  </p>
                  <p className="text-center text-sm text-blue-700 dark:text-blue-300">
                    カードの表側を上に向けて、端末の背面中央に当ててください
                  </p>
                </div>
                
                <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
            ) : (
              // 待機中: 通常の表示
              <>
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <CreditCard className="w-16 h-16 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>

                <Button
                  onClick={handleScan}
                  disabled={isScanning || !isNfcSupported}
                  size="lg"
                  className="w-full max-w-xs"
                >
                  カードをタッチ
                </Button>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 w-full max-w-md">
                  <p className="text-center text-sm text-blue-800 dark:text-blue-200">
                    💡 カードは端末の<strong>背面</strong>に当ててください
                  </p>
                </div>
              </>
            )}
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
                          カードID: <span className="font-mono">{lastResult.cardId}</span>
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

