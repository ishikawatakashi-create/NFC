"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function NFCTestPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [isScanning, setIsScanning] = useState(false)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`])
    console.log(`[${timestamp}] ${message}`)
  }

  const testNFC = async () => {
    setLogs([])
    setIsScanning(true)
    addLog("🔵 NFCテスト開始")

    // 1. Web NFC APIのサポート確認
    if (!("NDEFReader" in window)) {
      addLog("❌ NDEFReader not found - NFC not supported")
      setIsScanning(false)
      return
    }
    addLog("✅ NDEFReader found")

    // 2. HTTPS確認
    const protocol = window.location.protocol
    addLog(`🔒 Protocol: ${protocol}`)
    if (protocol !== "https:" && window.location.hostname !== "localhost") {
      addLog("❌ HTTPS required for NFC")
      setIsScanning(false)
      return
    }
    addLog("✅ HTTPS OK")

    try {
      // 3. NDEFReader作成
      addLog("📱 Creating NDEFReader...")
      const ndef = new (window as any).NDEFReader()
      addLog("✅ NDEFReader created")

      // 4. スキャン開始
      addLog("🔍 Starting scan...")
      await ndef.scan()
      addLog("✅ Scan started - カードをタッチしてください！")

      // 5. イベントリスナー設定
      ndef.addEventListener("reading", (event: any) => {
        addLog("🎉 'reading' event fired!")
        addLog(`📋 Serial Number: ${event.serialNumber}`)
        
        if (event.message && event.message.records) {
          addLog(`📄 NDEF Records: ${event.message.records.length}`)
          event.message.records.forEach((record: any, index: number) => {
            addLog(`  Record ${index}: ${record.recordType}`)
          })
        } else {
          addLog("📄 No NDEF records")
        }
        
        setIsScanning(false)
      })

      ndef.addEventListener("readingerror", (event: any) => {
        addLog(`⚠️ 'readingerror' event fired`)
        addLog(`   これは正常です（Suica、マイナンバーカード等）`)
        
        // イベントオブジェクトの詳細を確認
        addLog(`📋 Event keys: ${Object.keys(event).join(", ")}`)
        addLog(`📋 event.serialNumber: ${event.serialNumber || "undefined"}`)
        addLog(`📋 event.message: ${event.message || "undefined"}`)
        
        // すべてのプロパティを確認
        for (const key in event) {
          if (key !== "serialNumber" && key !== "message") {
            addLog(`📋 event.${key}: ${JSON.stringify(event[key])}`)
          }
        }
        
        // serialNumberを取得（複数の方法を試す）
        let serialNumber = event.serialNumber || 
                          event.message?.serialNumber || 
                          event.uid ||
                          event.id ||
                          null
        
        if (serialNumber) {
          addLog(`✅ シリアル番号は取得できました！`)
          addLog(`   Serial Number: ${serialNumber}`)
          addLog(`   カード登録/入退室記録が可能です`)
        } else {
          addLog(`❌ シリアル番号が取得できませんでした`)
          addLog(`   イベントオブジェクト全体:`)
          try {
            addLog(JSON.stringify(event, null, 2))
          } catch (e) {
            addLog(`   (JSON化できませんでした: ${e})`)
          }
        }
        
        setIsScanning(false)
      })

      // 6. タイムアウト設定
      setTimeout(() => {
        if (isScanning) {
          addLog("⏱️ Timeout (20秒)")
          setIsScanning(false)
        }
      }, 20000)
    } catch (error: any) {
      addLog(`❌ Error: ${error.message || String(error)}`)
      addLog(`❌ Error name: ${error.name}`)
      addLog(`❌ Error stack: ${error.stack}`)
      setIsScanning(false)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">🧪 NFC動作テスト</CardTitle>
          <p className="text-sm text-muted-foreground">
            NFCが正常に動作するか確認します
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={testNFC}
              disabled={isScanning}
              className="flex-1"
            >
              {isScanning ? "読み取り中..." : "NFCテスト開始"}
            </Button>
            <Button
              onClick={clearLogs}
              variant="outline"
            >
              クリア
            </Button>
          </div>

          <div className="rounded-lg bg-black p-4 min-h-[300px] max-h-[500px] overflow-y-auto">
            <div className="font-mono text-xs space-y-1">
              {logs.length === 0 ? (
                <p className="text-gray-400">ログが表示されます...</p>
              ) : (
                logs.map((log, index) => (
                  <p
                    key={index}
                    className={
                      log.includes("❌")
                        ? "text-red-400"
                        : log.includes("✅")
                        ? "text-green-400"
                        : log.includes("🎉")
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }
                  >
                    {log}
                  </p>
                ))
              )}
            </div>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>💡 使い方：</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>「NFCテスト開始」ボタンを押す</li>
              <li>「Scan started」と表示されたらカードをタッチ</li>
              <li>カードのシリアル番号が表示されれば成功</li>
            </ol>
          </div>

          <div className="text-xs text-muted-foreground">
            <p className="font-semibold">チェック項目：</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>NDEFReader found → NFCサポートあり</li>
              <li>HTTPS OK → セキュアな接続</li>
              <li>Scan started → スキャン開始成功</li>
              <li>Card detected → カード読み取り成功</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

