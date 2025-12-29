"use client"

import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Download, Filter, ChevronDown, ChevronUp, Edit } from "lucide-react"

type AccessLogType = "entry" | "exit" | "no_log" | "forced_exit"
type NotificationStatus = "sent" | "not_required"

interface AccessLog {
  id: string
  timestamp: string
  studentName: string
  type: AccessLogType
  device: string
  notification: NotificationStatus
  pointsAwarded?: boolean
}

interface CorrectionModalData {
  log: AccessLog
  correctionType: "type" | "timestamp" | "other"
  newValue: string
  memo: string
}

// 日時を24時間表記（秒まで）でフォーマット
function formatDateTime(dateTimeString: string) {
  const date = new Date(dateTimeString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

export default function AccessLogsPage() {
  const [showFilters, setShowFilters] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [logType, setLogType] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null)
  const [correctionType, setCorrectionType] = useState<"type" | "timestamp" | "other">("type")
  const [correctionValue, setCorrectionValue] = useState("")
  const [correctionMemo, setCorrectionMemo] = useState("")

  async function loadLogs() {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)
      if (logType && logType !== "all") params.append("type", logType)
      if (searchQuery) params.append("search", searchQuery)

      const res = await fetch(`/api/access-logs?${params.toString()}`, { cache: "no-store" })
      const data = await res.json()

      if (!res.ok || !data?.ok) {
        const errorMessage = typeof data?.error === "string" 
          ? data.error 
          : data?.error?.message || String(data?.error) || "Failed to load logs"
        throw new Error(errorMessage)
      }

      const apiLogs: Array<{
        id: string
        timestamp: string
        studentName: string
        type: string
        cardId?: string | null
        device: string
        notification: string
        pointsAwarded?: boolean
      }> = data.logs ?? []

      const mapped: AccessLog[] = apiLogs.map((log) => ({
        id: log.id,
        timestamp: formatDateTime(log.timestamp),
        studentName: log.studentName,
        type: log.type as AccessLogType,
        device: log.device || log.cardId || "不明",
        notification: log.notification as NotificationStatus,
        pointsAwarded: log.pointsAwarded || false,
      }))

      setLogs(mapped)
    } catch (e: any) {
      const errorMessage = e?.message || String(e) || "Unknown error"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // フィルタ変更時にログを再読み込み
  useEffect(() => {
    const timer = setTimeout(() => {
      loadLogs()
    }, 300) // デバウンス

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, logType])

  // 検索クエリでフィルタ（APIで取得したデータをクライアント側でフィルタ）
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.studentName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const handleExportCSV = () => {
    const headers = ["時刻", "生徒名", "種別", "端末", "通知"]
    const csvContent = [
      headers.join(","),
      ...filteredLogs.map((log) =>
        [
          log.timestamp,
          log.studentName,
          getLogTypeLabel(log.type, log.pointsAwarded),
          log.device,
          getNotificationLabel(log.notification),
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `access_logs_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
  }

  const handleOpenCorrection = (log: AccessLog) => {
    setSelectedLog(log)
    setCorrectionType("type")
    setCorrectionValue("")
    setCorrectionMemo("")
    setCorrectionModalOpen(true)
  }

  const handleSubmitCorrection = async () => {
    if (!selectedLog || !correctionValue) return

    try {
      const updateData: any = {}
      if (correctionType === "type") {
        updateData.eventType = correctionValue
      } else if (correctionType === "timestamp") {
        updateData.timestamp = correctionValue
      }
      if (correctionMemo) {
        updateData.memo = correctionMemo
      }

      const res = await fetch(`/api/access-logs/${selectedLog.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        const errorMessage = typeof data?.error === "string" 
          ? data.error 
          : data?.error?.message || String(data?.error) || "Failed to update log"
        throw new Error(errorMessage)
      }

      setCorrectionModalOpen(false)
      setCorrectionValue("")
      setCorrectionMemo("")
      await loadLogs()
    } catch (e: any) {
      const errorMessage = e?.message || String(e) || "Unknown error"
      alert(errorMessage)
    }
  }

  const getLogTypeLabel = (type: AccessLogType, pointsAwarded?: boolean) => {
    switch (type) {
      case "entry":
        return pointsAwarded ? "入室（ポイント付与）" : "入室"
      case "exit":
        return "退室"
      case "forced_exit":
        return "強制退室"
      case "no_log":
        return "ログ無し"
      default:
        return type
    }
  }

  const getLogTypeBadgeVariant = (type: AccessLogType) => {
    switch (type) {
      case "entry":
        return "default"
      case "exit":
        return "secondary"
      case "forced_exit":
        return "destructive"
      case "no_log":
        return "outline"
      default:
        return "outline"
    }
  }

  const getNotificationLabel = (status: NotificationStatus) => {
    switch (status) {
      case "sent":
        return "送信済み"
      case "not_required":
        return "通知不要"
      default:
        return status
    }
  }

  const getNotificationBadgeVariant = (status: NotificationStatus) => {
    switch (status) {
      case "sent":
        return "default"
      case "not_required":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <AdminLayout
      pageTitle="入退室ログ"
      breadcrumbs={[{ label: "入退室ログ" }]}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-transparent"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">絞り込み</span>
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button variant="default" size="sm" className="gap-2" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">CSV出力</span>
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {showFilters && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">開始日</Label>
                  <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">終了日</Label>
                  <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="log-type">種別</Label>
                  <Select value={logType} onValueChange={setLogType}>
                    <SelectTrigger id="log-type">
                      <SelectValue placeholder="すべて" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="entry">入室</SelectItem>
                      <SelectItem value="exit">退室</SelectItem>
                      <SelectItem value="forced_exit">強制退室</SelectItem>
                      <SelectItem value="no_log">ログ無し</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="search">生徒名検索</Label>
                  <Input
                    id="search"
                    placeholder="生徒名を入力"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading and Error Messages */}
        {isLoading && <div className="text-sm text-muted-foreground">読み込み中…</div>}
        {error && <div className="text-sm text-red-600">エラー: {error}</div>}

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>時刻</TableHead>
                    <TableHead>生徒名</TableHead>
                    <TableHead>種別</TableHead>
                    <TableHead>端末</TableHead>
                    <TableHead>通知</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <p className="text-sm text-muted-foreground">
                            {isLoading ? "読み込み中..." : "条件に一致するログがありません"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">{log.timestamp}</TableCell>
                        <TableCell className="font-medium">{log.studentName}</TableCell>
                        <TableCell>
                          <Badge variant={getLogTypeBadgeVariant(log.type)}>
                            {getLogTypeLabel(log.type, log.pointsAwarded)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{log.device}</TableCell>
                        <TableCell>
                          <Badge variant={getNotificationBadgeVariant(log.notification)}>
                            {getNotificationLabel(log.notification)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="gap-2" onClick={() => handleOpenCorrection(log)}>
                            <Edit className="h-4 w-4" />
                            訂正
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={correctionModalOpen} onOpenChange={setCorrectionModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>ログ訂正</DialogTitle>
              <DialogDescription>以下のログを訂正します。訂正履歴は自動的に記録されます。</DialogDescription>
            </DialogHeader>

            {selectedLog && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                  <h4 className="font-medium text-sm">訂正対象</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">時刻:</div>
                    <div className="font-mono">{selectedLog.timestamp}</div>
                    <div className="text-muted-foreground">生徒名:</div>
                    <div>{selectedLog.studentName}</div>
                    <div className="text-muted-foreground">種別:</div>
                    <div>
                      <Badge variant={getLogTypeBadgeVariant(selectedLog.type)}>
                        {getLogTypeLabel(selectedLog.type, selectedLog.pointsAwarded)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="correction-type">訂正内容</Label>
                  <Select value={correctionType} onValueChange={(value) => setCorrectionType(value as any)}>
                    <SelectTrigger id="correction-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="type">種別の訂正</SelectItem>
                      <SelectItem value="timestamp">時刻の訂正</SelectItem>
                      <SelectItem value="other">その他の訂正</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {correctionType === "type" && (
                  <div className="space-y-2">
                    <Label htmlFor="new-type">新しい種別</Label>
                    <Select value={correctionValue} onValueChange={setCorrectionValue}>
                      <SelectTrigger id="new-type">
                        <SelectValue placeholder="種別を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entry">入室</SelectItem>
                        <SelectItem value="exit">退室</SelectItem>
                        <SelectItem value="forced_exit">強制退室</SelectItem>
                        <SelectItem value="no_log">ログ無し</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {correctionType === "timestamp" && (
                  <div className="space-y-2">
                    <Label htmlFor="new-timestamp">新しい時刻</Label>
                    <Input
                      id="new-timestamp"
                      type="datetime-local"
                      value={correctionValue}
                      onChange={(e) => setCorrectionValue(e.target.value)}
                    />
                  </div>
                )}

                {correctionType === "other" && (
                  <div className="space-y-2">
                    <Label htmlFor="new-value">訂正後の値</Label>
                    <Input
                      id="new-value"
                      placeholder="訂正後の値を入力"
                      value={correctionValue}
                      onChange={(e) => setCorrectionValue(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="memo">メモ（任意）</Label>
                  <Textarea
                    id="memo"
                    placeholder="訂正理由や補足事項を入力"
                    value={correctionMemo}
                    onChange={(e) => setCorrectionMemo(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100">
                  <p className="font-medium">自動記録される情報</p>
                  <ul className="mt-1 list-inside list-disc text-xs space-y-0.5">
                    <li>訂正者: 管理者 (admin@robodan.jp)</li>
                    <li>訂正日時: {new Date().toLocaleString("ja-JP")}</li>
                    <li>訂正前の値も履歴として保持されます</li>
                  </ul>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setCorrectionModalOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleSubmitCorrection} disabled={!correctionValue}>
                訂正を保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
