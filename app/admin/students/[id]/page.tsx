"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, ArrowLeft, Loader2, Clock, Coins, Plus, Minus, History, Download, Search } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

type StudentStatus = "active" | "suspended" | "withdrawn" | "graduated"
type StudentClass = "kindergarten" | "beginner" | "challenger" | "creator" | "innovator"
type UserRole = "student" | "part_time" | "full_time"
type EventType = "entry" | "exit" | "no_log" | "forced_exit"

interface Student {
  id: string
  name: string
  grade?: string
  status: StudentStatus
  class?: StudentClass
  role?: UserRole
  card_id?: string | null
  last_event_type?: EventType | null
  last_event_timestamp?: string | null
  access_start_time?: string | null
  access_end_time?: string | null
  has_custom_access_time?: boolean
  current_points?: number
  bonus_threshold?: number | null
  has_custom_bonus_threshold?: boolean
  created_at?: string
}

interface PointTransaction {
  id: string
  transactionType: string
  points: number
  description?: string | null
  createdAt: string
  adminName?: string | null
}

interface AccessLog {
  id: string
  timestamp: string
  type: EventType
  cardId?: string | null
  device: string
  notification: string
  pointsAwarded?: boolean
}

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [student, setStudent] = useState<Student | null>(null)
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([])
  const [pointTransactions, setPointTransactions] = useState<PointTransaction[]>([])
  const [roleAccessTimes, setRoleAccessTimes] = useState<Record<string, { start_time: string; end_time: string }>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isLogsLoading, setIsLogsLoading] = useState(false)
  const [isPointsLoading, setIsPointsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [addPointsDialogOpen, setAddPointsDialogOpen] = useState(false)
  const [consumePointsDialogOpen, setConsumePointsDialogOpen] = useState(false)
  const [pointsHistoryDialogOpen, setPointsHistoryDialogOpen] = useState(false)
  const [addPointsAmount, setAddPointsAmount] = useState("")
  const [addPointsDescription, setAddPointsDescription] = useState("")
  const [consumePointsAmount, setConsumePointsAmount] = useState("")
  const [consumePointsDescription, setConsumePointsDescription] = useState("")
  const [isAddingPoints, setIsAddingPoints] = useState(false)
  const [isConsumingPoints, setIsConsumingPoints] = useState(false)
  // 履歴ダイアログの状態
  const [historySearchQuery, setHistorySearchQuery] = useState("")
  const [historyTransactionType, setHistoryTransactionType] = useState<string>("all")
  const [historyOffset, setHistoryOffset] = useState(0)
  const [historyHasMore, setHistoryHasMore] = useState(false)
  const [historyTotal, setHistoryTotal] = useState(0)
  const [isLoadingMoreHistory, setIsLoadingMoreHistory] = useState(false)

  useEffect(() => {
    async function getParams() {
      const resolvedParams = await params
      setStudentId(resolvedParams.id)
    }
    getParams()
  }, [params])

  useEffect(() => {
    if (!studentId) return

    async function loadStudent() {
      setIsLoading(true)
      setError(null)

      try {
        // 属性ごとの開放時間設定を取得
        const accessTimesRes = await fetch("/api/access-times", { cache: "no-store" })
        const accessTimesData = await accessTimesRes.json()
        if (accessTimesRes.ok && accessTimesData?.ok && accessTimesData?.accessTimes) {
          setRoleAccessTimes(accessTimesData.accessTimes)
        }

        // ユーザー情報を取得
        const res = await fetch(`/api/students/${studentId}`, { cache: "no-store" })
        const data = await res.json()

        if (!res.ok || !data?.ok) {
          const errorMessage = typeof data?.error === "string" 
            ? data.error 
            : data?.error?.message || String(data?.error) || "Failed to load student";
          throw new Error(errorMessage);
        }

        const apiStudent = data.student as {
          id: string | number
          name: string
          grade?: string | number | null
          status?: "active" | "suspended" | "withdrawn" | "graduated"
          class?: string | null
          role?: string | null
          card_id?: string | null
          last_event_type?: string | null
          last_event_timestamp?: string | null
          access_start_time?: string | null
          access_end_time?: string | null
          has_custom_access_time?: boolean
          current_points?: number
          bonus_threshold?: number | null
          has_custom_bonus_threshold?: boolean
          created_at?: string | null
        }

        const mapped: Student = {
          id: String(apiStudent.id),
          name: apiStudent.name ?? "",
          grade: apiStudent.grade ? String(apiStudent.grade) : undefined,
          status: (apiStudent.status ?? "active") as StudentStatus,
          class: apiStudent.class ? (apiStudent.class as StudentClass) : undefined,
          role: apiStudent.role ? (apiStudent.role as UserRole) : "student",
          card_id: apiStudent.card_id || null,
          last_event_type: apiStudent.last_event_type ? (apiStudent.last_event_type as EventType) : null,
          last_event_timestamp: apiStudent.last_event_timestamp || null,
          access_start_time: apiStudent.access_start_time || null,
          access_end_time: apiStudent.access_end_time || null,
          has_custom_access_time: apiStudent.has_custom_access_time || false,
          current_points: (apiStudent as any).current_points ?? 0,
          bonus_threshold: (apiStudent as any).bonus_threshold ?? null,
          has_custom_bonus_threshold: (apiStudent as any).has_custom_bonus_threshold ?? false,
          created_at: apiStudent.created_at || undefined,
        }

        setStudent(mapped)
      } catch (e: any) {
        const errorMessage = e?.message || String(e) || "Unknown error";
        setError(errorMessage);
      } finally {
        setIsLoading(false)
      }
    }

    loadStudent()
  }, [studentId])

  useEffect(() => {
    if (!studentId) return

    async function loadAccessLogs() {
      setIsLogsLoading(true)
      try {
        const res = await fetch(`/api/access-logs?studentId=${encodeURIComponent(studentId)}`, { cache: "no-store" })
        const data = await res.json()

        if (res.ok && data?.ok && data?.logs) {
          const mapped: AccessLog[] = data.logs.map((log: any) => ({
            id: log.id,
            timestamp: formatDateTime(log.timestamp),
            type: log.type as EventType,
            cardId: log.cardId || null,
            device: log.device || log.cardId || "不明",
            notification: log.notification,
            pointsAwarded: log.pointsAwarded || false,
          }))
          setAccessLogs(mapped)
        }
      } catch (e: any) {
        console.error("Failed to load access logs:", e)
      } finally {
        setIsLogsLoading(false)
      }
    }

    loadAccessLogs()
  }, [studentId])

  // 履歴を読み込む関数（ページネーション対応）
  const loadPointTransactions = useCallback(async (reset: boolean = false) => {
    if (!studentId) return

    if (reset) {
      setIsPointsLoading(true)
      setHistoryOffset(0)
    } else {
      setIsLoadingMoreHistory(true)
    }

    try {
      const params = new URLSearchParams({
        studentId: studentId,
        limit: "50",
        offset: reset ? "0" : historyOffset.toString(),
      })

      if (historySearchQuery.trim()) {
        params.append("search", historySearchQuery.trim())
      }
      if (historyTransactionType && historyTransactionType !== "all") {
        params.append("type", historyTransactionType)
      }

      const res = await fetch(`/api/points/history?${params.toString()}`, { cache: "no-store" })
      const data = await res.json()

      if (res.ok && data?.ok && data?.transactions) {
        const mapped: PointTransaction[] = data.transactions.map((transaction: any) => ({
          id: transaction.id,
          transactionType: transaction.transactionType,
          points: transaction.points,
          description: transaction.description || null,
          createdAt: formatDateTime(transaction.createdAt),
          adminName: transaction.adminName || null,
        }))

        if (reset) {
          setPointTransactions(mapped)
        } else {
          setPointTransactions((prev) => [...prev, ...mapped])
        }

        // ページネーション情報を更新
        if (data.pagination) {
          setHistoryHasMore(data.pagination.hasMore || false)
          setHistoryTotal(data.pagination.total || 0)
          if (!reset) {
            setHistoryOffset((prev) => prev + mapped.length)
          } else {
            setHistoryOffset(mapped.length)
          }
        }
      }
    } catch (e: any) {
      console.error("Failed to load point transactions:", e)
      toast({
        title: "エラー",
        description: "履歴の読み込みに失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsPointsLoading(false)
      setIsLoadingMoreHistory(false)
    }
  }, [studentId, historySearchQuery, historyTransactionType, historyOffset, toast])

  // 履歴ダイアログが開かれたときに履歴を読み込む
  useEffect(() => {
    if (pointsHistoryDialogOpen && studentId) {
      setHistorySearchQuery("")
      setHistoryTransactionType("all")
      loadPointTransactions(true)
    }
  }, [pointsHistoryDialogOpen, studentId, loadPointTransactions])

  // 検索・フィルタ変更時に履歴を再読み込み
  const handleHistorySearch = () => {
    loadPointTransactions(true)
  }

  const handleHistoryTypeChange = (type: string) => {
    setHistoryTransactionType(type)
    setHistoryOffset(0)
    // 少し遅延させてから読み込み（状態更新を待つ）
    setTimeout(() => {
      loadPointTransactions(true)
    }, 0)
  }

  async function handleAddPoints() {
    console.log("[Add Points] Button clicked", { studentId, addPointsAmount })
    
    if (!studentId) {
      console.error("[Add Points] studentId is missing")
      toast({
        title: "エラー",
        description: "生徒IDが取得できませんでした",
        variant: "destructive",
      })
      return
    }

    const points = parseInt(addPointsAmount, 10)
    if (isNaN(points) || points <= 0) {
      console.error("[Add Points] Invalid points value", addPointsAmount)
      toast({
        title: "エラー",
        description: "ポイント数は1以上の数値である必要があります",
        variant: "destructive",
      })
      return
    }

    console.log("[Add Points] Starting request", { studentId, points, description: addPointsDescription })
    setIsAddingPoints(true)
    try {
      console.log("[Add Points] Sending request to /api/points/add")
      const res = await fetch("/api/points/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          points,
          description: addPointsDescription || undefined,
        }),
      })

      console.log("[Add Points] Response status:", res.status, res.statusText)

      let data: any = {}
      try {
        data = await res.json()
        console.log("[Add Points] Response data:", data)
      } catch (parseError) {
        console.error("[Add Points] Failed to parse JSON response:", parseError)
        const text = await res.text()
        console.error("[Add Points] Response text:", text)
        throw new Error(`サーバーからの応答の解析に失敗しました（${res.status}）`)
      }

      if (!res.ok || !data?.ok) {
        console.error("[Add Points] API error:", {
          status: res.status,
          statusText: res.statusText,
          statusCode: res.status,
          data,
          error: data?.error,
        })
        throw new Error(data?.error || `ポイントの追加に失敗しました（${res.status}）`)
      }

      console.log("[Add Points] Success!")
      toast({
        title: "成功",
        description: `${points}ポイントを追加しました`,
      })

      setAddPointsDialogOpen(false)
      setAddPointsAmount("")
      setAddPointsDescription("")

      // 生徒情報を再読み込み
      const studentRes = await fetch(`/api/students/${studentId}`, { cache: "no-store" })
      const studentData = await studentRes.json()
      if (studentRes.ok && studentData?.ok && studentData?.student) {
        const apiStudent = studentData.student
        setStudent({
          ...student!,
          current_points: (apiStudent as any).current_points ?? 0,
        })
      }

      // ポイント履歴を再読み込み（ダイアログが開いている場合のみ）
      if (pointsHistoryDialogOpen) {
        loadPointTransactions(true)
      }
    } catch (e: any) {
      console.error("[Add Points] Exception:", e)
      console.error("[Add Points] Error details:", {
        message: e?.message,
        stack: e?.stack,
        name: e?.name,
      })
      toast({
        title: "エラー",
        description: e?.message || "ポイントの追加に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsAddingPoints(false)
      console.log("[Add Points] Finished")
    }
  }

  async function handleExportStudentHistory() {
    if (!studentId) return

    try {
      const params = new URLSearchParams({
        studentId: studentId,
        type: "all",
      })

      const url = `/api/points/export?${params.toString()}`
      window.open(url, "_blank")
    } catch (e: any) {
      toast({
        title: "エラー",
        description: "エクスポートに失敗しました",
        variant: "destructive",
      })
    }
  }

  async function handleConsumePoints() {
    if (!studentId) return

    const points = parseInt(consumePointsAmount, 10)
    if (isNaN(points) || points <= 0) {
      toast({
        title: "エラー",
        description: "ポイント数は1以上の数値である必要があります",
        variant: "destructive",
      })
      return
    }

    setIsConsumingPoints(true)
    try {
      const res = await fetch("/api/points/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          points,
          description: consumePointsDescription || undefined,
        }),
      })

      let data: any = {}
      try {
        data = await res.json()
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError)
        const text = await res.text()
        console.error("Response text:", text)
        throw new Error(`サーバーからの応答の解析に失敗しました（${res.status}）`)
      }

      if (!res.ok || !data?.ok) {
        console.error("Consume points API error:", {
          status: res.status,
          statusText: res.statusText,
          statusCode: res.status,
          data,
          error: data?.error,
        })
        throw new Error(data?.error || `ポイントの消費に失敗しました（${res.status}）`)
      }

      toast({
        title: "成功",
        description: `${points}ポイントを消費しました`,
      })

      setConsumePointsDialogOpen(false)
      setConsumePointsAmount("")
      setConsumePointsDescription("")

      // 生徒情報を再読み込み
      const studentRes = await fetch(`/api/students/${studentId}`, { cache: "no-store" })
      const studentData = await studentRes.json()
      if (studentRes.ok && studentData?.ok && studentData?.student) {
        const apiStudent = studentData.student
        setStudent({
          ...student!,
          current_points: (apiStudent as any).current_points ?? 0,
        })
      }

      // ポイント履歴を再読み込み（ダイアログが開いている場合のみ）
      if (pointsHistoryDialogOpen) {
        loadPointTransactions(true)
      }
    } catch (e: any) {
      console.error("Consume points error:", e)
      toast({
        title: "エラー",
        description: e?.message || "ポイントの消費に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsConsumingPoints(false)
    }
  }

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case "entry":
        return "入室"
      case "bonus":
        return "ボーナス"
      case "consumption":
        return "消費"
      case "admin_add":
        return "管理追加"
      case "admin_subtract":
        return "管理減算"
      default:
        return type
    }
  }

  const getStatusLabel = (status: StudentStatus) => {
    switch (status) {
      case "active":
        return "在籍"
      case "suspended":
        return "休会"
      case "withdrawn":
        return "退会"
      case "graduated":
        return "卒業"
    }
  }

  const getStatusVariant = (status: StudentStatus) => {
    switch (status) {
      case "active":
        return "default"
      case "suspended":
        return "secondary"
      case "withdrawn":
        return "outline"
      case "graduated":
        return "default"
    }
  }

  const getClassLabel = (studentClass?: StudentClass) => {
    if (!studentClass) return "-"
    switch (studentClass) {
      case "kindergarten":
        return "キンダー"
      case "beginner":
        return "ビギナー"
      case "challenger":
        return "チャレンジャー"
      case "creator":
        return "クリエイター"
      case "innovator":
        return "イノベーター"
    }
  }

  const getRoleLabel = (role?: UserRole) => {
    switch (role) {
      case "student":
        return "生徒"
      case "part_time":
        return "アルバイト"
      case "full_time":
        return "正社員"
      default:
        return "未設定"
    }
  }

  const getEventTypeLabel = (type?: EventType | null, pointsAwarded?: boolean) => {
    if (!type) return "-"
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
        return "-"
    }
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "-"
    try {
      const date = new Date(dateString)
      return date.toLocaleString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateString
    }
  }

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    } catch {
      return dateString
    }
  }

  const formatTime = (time: string | null | undefined) => {
    if (!time) return "-"
    return time.substring(0, 5)
  }

  const getAccessTime = (student: Student) => {
    // 個別設定がある場合は個別設定の時間を表示
    if (student.has_custom_access_time && student.access_start_time && student.access_end_time) {
      return {
        start: formatTime(student.access_start_time),
        end: formatTime(student.access_end_time),
        isCustom: true,
      }
    }

    // 個別設定がない場合は属性に紐づいた開放時間を表示
    if (student.role && roleAccessTimes[student.role]) {
      return {
        start: formatTime(roleAccessTimes[student.role].start_time),
        end: formatTime(roleAccessTimes[student.role].end_time),
        isCustom: false,
      }
    }

    // デフォルト値
    return {
      start: "09:00",
      end: "20:00",
      isCustom: false,
    }
  }

  const handleEdit = () => {
    if (student) {
      router.push(`/admin/students?edit=${student.id}`)
    }
  }

  if (isLoading) {
    return (
      <AdminLayout
        pageTitle="ユーザー詳細"
        breadcrumbs={[{ label: "ユーザー一覧", href: "/admin/students" }, { label: "ユーザー詳細" }]}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    )
  }

  if (error || !student) {
    return (
      <AdminLayout
        pageTitle="ユーザー詳細"
        breadcrumbs={[{ label: "ユーザー一覧", href: "/admin/students" }, { label: "ユーザー詳細" }]}
      >
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-red-600 mb-4">エラー: {error || "ユーザーが見つかりません"}</p>
              <Button variant="outline" onClick={() => router.push("/admin/students")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                ユーザー一覧に戻る
              </Button>
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    )
  }

  const accessTime = getAccessTime(student)

  return (
    <AdminLayout
      pageTitle="ユーザー詳細"
      breadcrumbs={[{ label: "ユーザー一覧", href: "/admin/students" }, { label: student.name }]}
      actions={
        <>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => router.push("/admin/students")}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">戻る</span>
          </Button>
          <Button size="sm" className="gap-2" onClick={handleEdit}>
            <Pencil className="h-4 w-4" />
            <span className="hidden sm:inline">編集</span>
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* 基本情報 */}
        <Card>
          <CardHeader>
            <CardTitle>ユーザー情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">名前</label>
                <p className="text-base font-semibold mt-1">{student.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">ステータス</label>
                <div className="mt-1">
                  <Badge variant={getStatusVariant(student.status)}>{getStatusLabel(student.status)}</Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">ユーザーID (UUID)</label>
                <p className="text-base mt-1 font-mono text-sm break-all">{student.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">属性</label>
                <div className="mt-1">
                  <Badge variant="outline">{getRoleLabel(student.role)}</Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">学年</label>
                <p className="text-base mt-1">{student.grade || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">クラス</label>
                <p className="text-base mt-1">{getClassLabel(student.class)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">NFCカードID</label>
                <p className="text-base mt-1 font-mono text-sm">{student.card_id || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">登録日時</label>
                <p className="text-base mt-1">{formatDate(student.created_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 最終イベント情報 */}
        <Card>
          <CardHeader>
            <CardTitle>最終イベント情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">最終イベント種別</label>
                <p className="text-base mt-1">{getEventTypeLabel(student.last_event_type)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">最終イベント時刻</label>
                <p className="text-base mt-1">{formatDate(student.last_event_timestamp)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 開放時間設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              開放時間設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">開始時刻</label>
                <p className="text-base mt-1">{accessTime.start}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">終了時刻</label>
                <p className="text-base mt-1">{accessTime.end}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">設定種別</label>
                <div className="mt-1">
                  {accessTime.isCustom ? (
                    <Badge variant="default">個別設定</Badge>
                  ) : (
                    <Badge variant="secondary">属性設定</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ポイント管理 */}
        {student.role === "student" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                ポイント管理
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">現在のポイント</label>
                  <p className="text-2xl font-bold mt-1">{student.current_points ?? 0} pt</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setAddPointsDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    追加
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setConsumePointsDialogOpen(true)}
                  >
                    <Minus className="h-4 w-4" />
                    消費
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setPointsHistoryDialogOpen(true)}
                  >
                    <History className="h-4 w-4" />
                    履歴
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleExportStudentHistory}
                  >
                    <Download className="h-4 w-4" />
                    エクスポート
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 入退室ログ */}
        <Card>
          <CardHeader>
            <CardTitle>入退室ログ</CardTitle>
          </CardHeader>
          <CardContent>
            {isLogsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
              </div>
            ) : accessLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                入退室ログがありません
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日時</TableHead>
                      <TableHead>種別</TableHead>
                      <TableHead>端末/カードID</TableHead>
                      <TableHead>通知</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accessLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.timestamp}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              log.type === "entry" 
                                ? "default" 
                                : log.type === "forced_exit" 
                                ? "destructive" 
                                : "secondary"
                            }
                          >
                            {getEventTypeLabel(log.type, log.pointsAwarded)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{log.device}</TableCell>
                        <TableCell>
                          <Badge variant={log.notification === "sent" ? "default" : "outline"}>
                            {log.notification === "sent" ? "送信済み" : "不要"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ポイント追加ダイアログ */}
        <Dialog open={addPointsDialogOpen} onOpenChange={setAddPointsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ポイント追加</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="add-points-amount">ポイント数</Label>
                  <Input
                  id="add-points-amount"
                  type="number"
                  min="1"
                  value={addPointsAmount}
                  onChange={(e) => setAddPointsAmount(e.target.value)}
                  placeholder="追加するポイント数を入力"
                  disabled={isAddingPoints}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-points-description">説明（任意）</Label>
                <Textarea
                  id="add-points-description"
                  value={addPointsDescription}
                  onChange={(e) => setAddPointsDescription(e.target.value)}
                  placeholder="ポイント追加の理由など"
                  rows={3}
                  disabled={isAddingPoints}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddPointsDialogOpen(false)} disabled={isAddingPoints}>
                キャンセル
              </Button>
              <Button onClick={handleAddPoints} disabled={isAddingPoints}>
                {isAddingPoints ? "追加中..." : "追加"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ポイント消費ダイアログ */}
        <Dialog open={consumePointsDialogOpen} onOpenChange={setConsumePointsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ポイント消費</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="consume-points-amount">ポイント数</Label>
                <Input
                  id="consume-points-amount"
                  type="number"
                  min="1"
                  value={consumePointsAmount}
                  onChange={(e) => setConsumePointsAmount(e.target.value)}
                  placeholder="消費するポイント数を入力"
                  disabled={isConsumingPoints}
                />
                <p className="text-sm text-muted-foreground">
                  現在のポイント: {student?.current_points ?? 0} pt
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="consume-points-description">説明（任意）</Label>
                <Textarea
                  id="consume-points-description"
                  value={consumePointsDescription}
                  onChange={(e) => setConsumePointsDescription(e.target.value)}
                  placeholder="ポイント消費の理由など"
                  rows={3}
                  disabled={isConsumingPoints}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConsumePointsDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleConsumePoints}>消費</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ポイント履歴ダイアログ */}
        <Dialog open={pointsHistoryDialogOpen} onOpenChange={setPointsHistoryDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>ポイント履歴</DialogTitle>
            </DialogHeader>
            
            {/* 検索・フィルタ */}
            <div className="space-y-4 pb-4 border-b">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="説明で検索..."
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleHistorySearch()
                      }
                    }}
                    className="pl-9"
                  />
                </div>
                <Select value={historyTransactionType} onValueChange={handleHistoryTypeChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="種別でフィルタ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="entry">入室</SelectItem>
                    <SelectItem value="bonus">ボーナス</SelectItem>
                    <SelectItem value="admin_add">管理追加</SelectItem>
                    <SelectItem value="admin_subtract">管理減算</SelectItem>
                    <SelectItem value="consumption">消費</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleHistorySearch} variant="outline" size="default">
                  検索
                </Button>
              </div>
              {historyTotal > 0 && (
                <p className="text-sm text-muted-foreground">
                  全{historyTotal}件中 {pointTransactions.length}件を表示
                </p>
              )}
            </div>

            {/* 履歴テーブル */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {isPointsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                </div>
              ) : pointTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  ポイント履歴がありません
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>日時</TableHead>
                        <TableHead>種別</TableHead>
                        <TableHead className="text-right">ポイント</TableHead>
                        <TableHead>説明</TableHead>
                        <TableHead>操作者</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pointTransactions.map((transaction: any) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{transaction.createdAt}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getTransactionTypeLabel(transaction.transactionType)}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${transaction.points > 0 ? "text-green-600" : "text-red-600"}`}>
                            {transaction.points > 0 ? "+" : ""}{transaction.points} pt
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={transaction.description || ""}>
                            {transaction.description || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {transaction.adminName || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {/* もっと見るボタン */}
                  {historyHasMore && (
                    <div className="flex justify-center py-4">
                      <Button
                        variant="outline"
                        onClick={() => loadPointTransactions(false)}
                        disabled={isLoadingMoreHistory}
                      >
                        {isLoadingMoreHistory ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            読み込み中...
                          </>
                        ) : (
                          "もっと見る"
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setPointsHistoryDialogOpen(false)}>
                閉じる
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
