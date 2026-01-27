"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
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
import { Download, Edit, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"

type AccessLogType = "entry" | "exit" | "no_log" | "forced_exit"
type NotificationStatus = "sent" | "not_required"
type SortDirection = "asc" | "desc"
type AccessLogSortKey = "timestamp" | "studentName" | "type" | "device" | "notification"

interface AccessLog {
  id: string
  timestamp: string
  timestampValue?: number
  studentName: string
  studentId?: string
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
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [logType, setLogType] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortConfig, setSortConfig] = useState<{ key: AccessLogSortKey | null; direction: SortDirection }>({
    key: null,
    direction: "asc",
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
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
        studentId?: string
        type: string
        cardId?: string | null
        device: string
        notification: string
        pointsAwarded?: boolean
      }> = data.logs ?? []

      const mapped: AccessLog[] = apiLogs.map((log) => {
        const timestampValueRaw = log.timestamp ? new Date(log.timestamp).getTime() : undefined
        const timestampValue =
          timestampValueRaw != null && !Number.isNaN(timestampValueRaw) ? timestampValueRaw : undefined
        return {
          id: log.id,
          timestamp: formatDateTime(log.timestamp),
          timestampValue,
          studentName: log.studentName,
          studentId: log.studentId || undefined,
          type: log.type as AccessLogType,
          device: log.device || log.cardId || "不明",
          notification: log.notification as NotificationStatus,
          pointsAwarded: log.pointsAwarded || false,
        }
      })

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

  useEffect(() => {
    setCurrentPage(1)
  }, [startDate, endDate, logType, searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [pageSize])

  // 検索クエリでフィルタ（APIで取得したデータをクライアント側でフィルタ）
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.studentName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const logTypeOrder: Record<AccessLogType, number> = {
    entry: 1,
    exit: 2,
    forced_exit: 3,
    no_log: 4,
  }

  const notificationOrder: Record<NotificationStatus, number> = {
    sent: 1,
    not_required: 2,
  }

  const compareStrings = (a?: string, b?: string) => {
    const aValue = a?.trim()
    const bValue = b?.trim()
    if (!aValue && !bValue) return 0
    if (!aValue) return 1
    if (!bValue) return -1
    return aValue.localeCompare(bValue, "ja", { numeric: true, sensitivity: "base" })
  }

  const compareNumbers = (a?: number, b?: number) => {
    if (a == null && b == null) return 0
    if (a == null) return 1
    if (b == null) return -1
    return a - b
  }

  const handleSort = (key: AccessLogSortKey) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" }
      }
      return { key, direction: "asc" }
    })
  }

  const getAriaSort = (key: AccessLogSortKey) => {
    if (sortConfig.key !== key) return "none"
    return sortConfig.direction === "asc" ? "ascending" : "descending"
  }

  const renderSortIcon = (key: AccessLogSortKey) => {
    if (sortConfig.key !== key) {
      return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="h-3.5 w-3.5 text-foreground" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-foreground" />
    )
  }

  const getSortButtonClass = (align: "left" | "center" | "right", key: AccessLogSortKey) => {
    const alignment = align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"
    const tone = sortConfig.key === key ? "text-foreground" : "text-foreground/70"
    return `flex w-full items-center gap-1 text-xs font-semibold transition-colors ${alignment} ${tone} hover:text-foreground`
  }

  const sortedLogs = sortConfig.key
    ? [...filteredLogs].sort((a, b) => {
        const direction = sortConfig.direction === "asc" ? 1 : -1
        switch (sortConfig.key) {
          case "timestamp":
            return compareNumbers(a.timestampValue, b.timestampValue) * direction
          case "studentName":
            return compareStrings(a.studentName, b.studentName) * direction
          case "type":
            return compareNumbers(logTypeOrder[a.type], logTypeOrder[b.type]) * direction
          case "device":
            return compareStrings(a.device, b.device) * direction
          case "notification":
            return compareNumbers(notificationOrder[a.notification], notificationOrder[b.notification]) * direction
          default:
            return 0
        }
      })
    : filteredLogs

  const totalLogs = sortedLogs.length
  const totalPages = Math.max(1, Math.ceil(totalLogs / pageSize))
  const currentPageSafe = Math.min(currentPage, totalPages)
  const startIndex = totalLogs === 0 ? 0 : (currentPageSafe - 1) * pageSize + 1
  const endIndex = Math.min(totalLogs, currentPageSafe * pageSize)
  const paginatedLogs = sortedLogs.slice((currentPageSafe - 1) * pageSize, currentPageSafe * pageSize)

  const getPaginationItems = (page: number, total: number) => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1)
    }

    const items: Array<number | "ellipsis"> = []
    const left = Math.max(2, page - 1)
    const right = Math.min(total - 1, page + 1)

    items.push(1)
    if (left > 2) {
      items.push("ellipsis")
    }
    for (let value = left; value <= right; value += 1) {
      items.push(value)
    }
    if (right < total - 1) {
      items.push("ellipsis")
    }
    items.push(total)

    return items
  }

  const paginationItems = getPaginationItems(currentPageSafe, totalPages)
  const isPrevDisabled = currentPageSafe <= 1
  const isNextDisabled = currentPageSafe >= totalPages

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const handleExportCSV = () => {
    const headers = ["時刻", "生徒名", "種別", "端末", "通知"]
    const csvContent = [
      headers.join(","),
      ...sortedLogs.map((log) =>
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
        return "status"
      case "exit":
        return "neutral"
      case "forced_exit":
        return "danger"
      case "no_log":
        return "warning"
      default:
        return "neutral"
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
        return "status"
      case "not_required":
        return "neutral"
      default:
        return "neutral"
    }
  }

  return (
    <AdminLayout
      pageTitle="入退室ログ"
      breadcrumbs={[{ label: "入退室ログ" }]}
      actions={
        <>
          <Button variant="secondary" size="sm" className="gap-2" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">CSV出力</span>
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-4">
            <div className="grid gap-3 md:grid-cols-[160px_160px_200px_1fr]">
              <div className="space-y-1.5">
                <Label htmlFor="start-date" className="text-xs text-muted-foreground">
                  開始日
                </Label>
                <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end-date" className="text-xs text-muted-foreground">
                  終了日
                </Label>
                <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="log-type" className="text-xs text-muted-foreground">
                  種別
                </Label>
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
              <div className="space-y-1.5">
                <Label htmlFor="search" className="text-xs text-muted-foreground">
                  生徒名検索
                </Label>
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

        {/* Loading and Error Messages */}
        {isLoading && <div className="text-sm text-muted-foreground">読み込み中…</div>}
        {error && <div className="text-sm text-destructive">エラー: {error}</div>}

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead aria-sort={getAriaSort("timestamp")}>
                      <button
                        type="button"
                        onClick={() => handleSort("timestamp")}
                        className={getSortButtonClass("left", "timestamp")}
                      >
                        時刻
                        {renderSortIcon("timestamp")}
                      </button>
                    </TableHead>
                    <TableHead aria-sort={getAriaSort("studentName")}>
                      <button
                        type="button"
                        onClick={() => handleSort("studentName")}
                        className={getSortButtonClass("left", "studentName")}
                      >
                        生徒名
                        {renderSortIcon("studentName")}
                      </button>
                    </TableHead>
                    <TableHead aria-sort={getAriaSort("type")}>
                      <button
                        type="button"
                        onClick={() => handleSort("type")}
                        className={getSortButtonClass("left", "type")}
                      >
                        種別
                        {renderSortIcon("type")}
                      </button>
                    </TableHead>
                    <TableHead aria-sort={getAriaSort("device")}>
                      <button
                        type="button"
                        onClick={() => handleSort("device")}
                        className={getSortButtonClass("left", "device")}
                      >
                        端末
                        {renderSortIcon("device")}
                      </button>
                    </TableHead>
                    <TableHead aria-sort={getAriaSort("notification")}>
                      <button
                        type="button"
                        onClick={() => handleSort("notification")}
                        className={getSortButtonClass("left", "notification")}
                      >
                        通知
                        {renderSortIcon("notification")}
                      </button>
                    </TableHead>
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
                    paginatedLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">{log.timestamp}</TableCell>
                        <TableCell>
                          {log.studentId ? (
                            <Link className="link-accent" href={`/admin/students/${log.studentId}`}>
                              {log.studentName}
                            </Link>
                          ) : (
                            <span className="font-semibold">{log.studentName}</span>
                          )}
                        </TableCell>
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
            {totalLogs > 0 && (
              <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  {startIndex}-{endIndex} / {totalLogs}件
                </div>
                <div className="flex flex-col items-center gap-3 sm:flex-row">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>表示件数</span>
                    <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                      <SelectTrigger className="h-8 w-[90px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Pagination className="w-auto">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(event) => {
                            event.preventDefault()
                            if (!isPrevDisabled) {
                              setCurrentPage(currentPageSafe - 1)
                            }
                          }}
                          aria-disabled={isPrevDisabled}
                          tabIndex={isPrevDisabled ? -1 : undefined}
                          className={isPrevDisabled ? "pointer-events-none opacity-50" : undefined}
                        />
                      </PaginationItem>
                      {paginationItems.map((item, index) =>
                        item === "ellipsis" ? (
                          <PaginationItem key={`ellipsis-${index}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={item}>
                            <PaginationLink
                              href="#"
                              isActive={item === currentPageSafe}
                              onClick={(event) => {
                                event.preventDefault()
                                if (item !== currentPageSafe) {
                                  setCurrentPage(item)
                                }
                              }}
                            >
                              {item}
                            </PaginationLink>
                          </PaginationItem>
                        ),
                      )}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(event) => {
                            event.preventDefault()
                            if (!isNextDisabled) {
                              setCurrentPage(currentPageSafe + 1)
                            }
                          }}
                          aria-disabled={isNextDisabled}
                          tabIndex={isNextDisabled ? -1 : undefined}
                          className={isNextDisabled ? "pointer-events-none opacity-50" : undefined}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            )}
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

                <div className="rounded-md border border-border bg-secondary p-3 text-sm text-foreground">
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
