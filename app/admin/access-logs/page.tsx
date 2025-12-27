"use client"

import { useState } from "react"
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

type AccessLogType = "entry" | "exit" | "forced_exit"
type NotificationStatus = "sent" | "not_sent" | "not_applicable"

interface AccessLog {
  id: string
  timestamp: string
  studentName: string
  type: AccessLogType
  device: string
  notification: NotificationStatus
}

interface CorrectionModalData {
  log: AccessLog
  correctionType: "type" | "timestamp" | "other"
  newValue: string
  memo: string
}

const mockLogs: AccessLog[] = [
  {
    id: "1",
    timestamp: "2024-01-15 09:30:15",
    studentName: "山田太郎",
    type: "entry",
    device: "タブレット A-01",
    notification: "sent",
  },
  {
    id: "2",
    timestamp: "2024-01-15 12:45:30",
    studentName: "山田太郎",
    type: "exit",
    device: "タブレット A-02",
    notification: "sent",
  },
  {
    id: "3",
    timestamp: "2024-01-15 09:25:10",
    studentName: "佐藤花子",
    type: "entry",
    device: "タブレット B-01",
    notification: "sent",
  },
  {
    id: "4",
    timestamp: "2024-01-15 13:00:00",
    studentName: "佐藤花子",
    type: "forced_exit",
    device: "システム自動",
    notification: "not_applicable",
  },
  {
    id: "5",
    timestamp: "2024-01-15 10:15:22",
    studentName: "鈴木一郎",
    type: "entry",
    device: "タブレット C-01",
    notification: "not_sent",
  },
]

export default function AccessLogsPage() {
  const [showFilters, setShowFilters] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [logType, setLogType] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [logs, setLogs] = useState<AccessLog[]>(mockLogs)
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null)
  const [correctionType, setCorrectionType] = useState<"type" | "timestamp" | "other">("type")
  const [correctionValue, setCorrectionValue] = useState("")
  const [correctionMemo, setCorrectionMemo] = useState("")

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.studentName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = logType === "all" || log.type === logType
    const matchesDateRange = (!startDate || log.timestamp >= startDate) && (!endDate || log.timestamp <= endDate)

    return matchesSearch && matchesType && matchesDateRange
  })

  const handleExportCSV = () => {
    const headers = ["時刻", "生徒名", "種別", "端末", "通知"]
    const csvContent = [
      headers.join(","),
      ...filteredLogs.map((log) =>
        [
          log.timestamp,
          log.studentName,
          getLogTypeLabel(log.type),
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

  const handleSubmitCorrection = () => {
    if (!selectedLog) return

    // In a real application, this would make an API call to save the correction
    console.log("Correction submitted:", {
      logId: selectedLog.id,
      correctionType,
      newValue: correctionValue,
      memo: correctionMemo,
      correctedBy: "管理者",
      correctedAt: new Date().toISOString(),
    })

    setCorrectionModalOpen(false)
    // Show success message in production
  }

  const getLogTypeLabel = (type: AccessLogType) => {
    switch (type) {
      case "entry":
        return "入室"
      case "exit":
        return "退室"
      case "forced_exit":
        return "強制退室"
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
      default:
        return "outline"
    }
  }

  const getNotificationLabel = (status: NotificationStatus) => {
    switch (status) {
      case "sent":
        return "送信済"
      case "not_sent":
        return "未送信"
      case "not_applicable":
        return "対象外"
      default:
        return status
    }
  }

  const getNotificationBadgeVariant = (status: NotificationStatus) => {
    switch (status) {
      case "sent":
        return "default"
      case "not_sent":
        return "destructive"
      case "not_applicable":
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
                          <p className="text-sm text-muted-foreground">条件に一致するログがありません</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">{log.timestamp}</TableCell>
                        <TableCell className="font-medium">{log.studentName}</TableCell>
                        <TableCell>
                          <Badge variant={getLogTypeBadgeVariant(log.type)}>{getLogTypeLabel(log.type)}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{log.device}</TableCell>
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
                        {getLogTypeLabel(selectedLog.type)}
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
