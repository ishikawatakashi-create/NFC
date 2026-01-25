"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { AlertTriangle, Save, Coins, Users, Plus, Minus, Download, CheckCircle, Database, BarChart3, Upload } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { ClassBonusThresholdDialog } from "@/components/admin/class-bonus-threshold-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface Student {
  id: string
  name: string
  current_points: number
  monthly_points?: number
  role?: string
  class?: string
}

interface PointHistory {
  date: string
  total: number
  entry: number
  bonus: number
  consumption: number
  admin_add: number
  admin_subtract: number
}

export default function PointsPage() {
  const { toast } = useToast()

  // ボーナス閾値設定ダイアログの状態（クラス別）
  const [kindergartenBonusDialogOpen, setKindergartenBonusDialogOpen] = useState(false)
  const [beginnerBonusDialogOpen, setBeginnerBonusDialogOpen] = useState(false)
  const [challengerBonusDialogOpen, setChallengerBonusDialogOpen] = useState(false)
  const [creatorBonusDialogOpen, setCreatorBonusDialogOpen] = useState(false)
  const [innovatorBonusDialogOpen, setInnovatorBonusDialogOpen] = useState(false)

  // ポイント設定
  const [entryPoints, setEntryPoints] = useState("1")
  const [dailyLimit, setDailyLimit] = useState(true)

  // 生徒一覧とポイント推移
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pointHistory, setPointHistory] = useState<PointHistory[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "year">("month")
  const [rankingType, setRankingType] = useState<"total" | "monthly">("total")
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [studentHistoryDialogOpen, setStudentHistoryDialogOpen] = useState(false)
  const [studentPointTransactions, setStudentPointTransactions] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // 一括ポイント付与
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [bulkAddDialogOpen, setBulkAddDialogOpen] = useState(false)
  const [bulkAddPoints, setBulkAddPoints] = useState<Record<string, string>>({})
  const [bulkAddDescription, setBulkAddDescription] = useState("")
  const [isBulkAdding, setIsBulkAdding] = useState(false)

  // 一括ポイント減算
  const [bulkSubtractDialogOpen, setBulkSubtractDialogOpen] = useState(false)
  const [bulkSubtractPoints, setBulkSubtractPoints] = useState<Record<string, string>>({})
  const [bulkSubtractDescription, setBulkSubtractDescription] = useState("")
  const [isBulkSubtracting, setIsBulkSubtracting] = useState(false)
  const [pointsCsvMode, setPointsCsvMode] = useState<"all" | "by_student">("by_student")
  const [pointsCsvFile, setPointsCsvFile] = useState<File | null>(null)
  const [isPointsCsvImporting, setIsPointsCsvImporting] = useState(false)
  const pointsCsvInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    loadPointSettings()
    loadStudents()
    loadPointHistory()
  }, [selectedPeriod, rankingType])

  // ダイアログが開かれたときに選択した生徒のポイント数を初期化
  useEffect(() => {
    if (bulkAddDialogOpen) {
      const initialPoints: Record<string, string> = {}
      selectedStudentIds.forEach((studentId) => {
        initialPoints[studentId] = ""
      })
      setBulkAddPoints(initialPoints)
    }
  }, [bulkAddDialogOpen, selectedStudentIds])

  useEffect(() => {
    if (bulkSubtractDialogOpen) {
      const initialPoints: Record<string, string> = {}
      selectedStudentIds.forEach((studentId) => {
        initialPoints[studentId] = ""
      })
      setBulkSubtractPoints(initialPoints)
    }
  }, [bulkSubtractDialogOpen, selectedStudentIds])

  async function loadPointSettings() {
    try {
      const res = await fetch("/api/point-settings", { cache: "no-store" })
      const data = await res.json()

      if (res.ok && data?.ok && data?.settings) {
        setEntryPoints(String(data.settings.entry_points ?? 1))
        setDailyLimit(data.settings.daily_limit ?? true)
      }
    } catch (e: any) {
      console.error("Failed to load point settings:", e)
    }
  }

  async function loadStudents() {
    setIsLoading(true)
    try {
      const res = await fetch("/api/students", { cache: "no-store" })
      const data = await res.json()

      if (res.ok && data?.ok && data?.students) {
        let studentsWithPoints = data.students
          .filter((s: any) => s.role === "student")
          .map((s: any) => ({
            id: String(s.id),
            name: s.name,
            current_points: (s as any).current_points ?? 0,
            role: s.role,
            class: s.class,
          }))

        // 月内ランキングの場合、一括取得APIを使用
        if (rankingType === "monthly") {
          try {
            const rankingRes = await fetch("/api/points/monthly-ranking", { cache: "no-store" })
            const rankingData = await rankingRes.json()

            if (rankingRes.ok && rankingData?.ok && rankingData?.rankings) {
              // ランキングデータと生徒データをマージ
              const rankingMap = new Map(
                rankingData.rankings.map((r: any) => [r.id, r.monthlyPoints])
              )
              studentsWithPoints = studentsWithPoints.map((student: Student) => ({
                ...student,
                monthly_points: rankingMap.get(student.id) || 0,
              }))
              studentsWithPoints = studentsWithPoints.sort(
                (a: any, b: any) => (b.monthly_points || 0) - (a.monthly_points || 0)
              )
            } else {
              // フォールバック: 各生徒のポイントを0に設定
              studentsWithPoints = studentsWithPoints.map((student: Student) => ({
                ...student,
                monthly_points: 0,
              }))
            }
          } catch (e) {
            console.error("Failed to load monthly ranking:", e)
            // フォールバック: 各生徒のポイントを0に設定
            studentsWithPoints = studentsWithPoints.map((student: Student) => ({
              ...student,
              monthly_points: 0,
            }))
          }
        } else {
          // 総合ランキング
          studentsWithPoints = studentsWithPoints.sort(
            (a: Student, b: Student) => b.current_points - a.current_points
          )
        }

        setStudents(studentsWithPoints)
      }
    } catch (e: any) {
      console.error("Failed to load students:", e)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadStudentHistory(studentId: string) {
    setIsLoadingHistory(true)
    setStudentPointTransactions([]) // 前回のデータをクリア
    try {
      const res = await fetch(`/api/points/history?studentId=${encodeURIComponent(studentId)}`, {
        cache: "no-store",
      })
      const data = await res.json()

      if (res.ok && data?.ok && data?.transactions) {
        setStudentPointTransactions(data.transactions)
      } else {
        console.error("Failed to load student history:", data?.error)
        toast({
          title: "エラー",
          description: data?.error || "履歴の読み込みに失敗しました",
          variant: "destructive",
        })
      }
    } catch (e: any) {
      console.error("Failed to load student history:", e)
      toast({
        title: "エラー",
        description: "履歴の読み込みに失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsLoadingHistory(false)
    }
  }

  function handleStudentClick(student: Student) {
    setSelectedStudent(student)
    setStudentHistoryDialogOpen(true)
    loadStudentHistory(student.id)
  }

  function handleSelectStudent(studentId: string, checked: boolean) {
    const newSelected = new Set(selectedStudentIds)
    if (checked) {
      newSelected.add(studentId)
    } else {
      newSelected.delete(studentId)
    }
    setSelectedStudentIds(newSelected)
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedStudentIds(new Set(students.map((s) => s.id)))
    } else {
      setSelectedStudentIds(new Set())
    }
  }

  function handleBulkPointsChange(studentId: string, value: string) {
    setBulkAddPoints((prev) => ({
      ...prev,
      [studentId]: value,
    }))
  }

  function handleBulkSubtractPointsChange(studentId: string, value: string) {
    setBulkSubtractPoints((prev) => ({
      ...prev,
      [studentId]: value,
    }))
  }

  function handleSetAllPoints(points: string) {
    const newPoints: Record<string, string> = {}
    selectedStudentIds.forEach((studentId) => {
      newPoints[studentId] = points
    })
    setBulkAddPoints(newPoints)
  }

  function handleSetAllSubtractPoints(points: string) {
    const newPoints: Record<string, string> = {}
    selectedStudentIds.forEach((studentId) => {
      newPoints[studentId] = points
    })
    setBulkSubtractPoints(newPoints)
  }

  async function handleBulkAdd() {
    if (selectedStudentIds.size === 0) {
      toast({
        title: "エラー",
        description: "少なくとも1名の生徒を選択してください",
        variant: "destructive",
      })
      return
    }

    // 各生徒のポイント数を検証
    const assignments: Array<{ studentId: string; points: number; description?: string }> = []
    const errors: string[] = []

    selectedStudentIds.forEach((studentId) => {
      const pointsStr = bulkAddPoints[studentId] || ""
      const points = parseInt(pointsStr, 10)

      if (!pointsStr || isNaN(points) || points <= 0) {
        const student = students.find((s) => s.id === studentId)
        errors.push(`${student?.name || studentId}: ポイント数が無効です`)
        return
      }

      assignments.push({
        studentId,
        points,
        description: bulkAddDescription || undefined,
      })
    })

    if (errors.length > 0) {
      toast({
        title: "エラー",
        description: errors.join("\n"),
        variant: "destructive",
      })
      return
    }

    if (assignments.length === 0) {
      toast({
        title: "エラー",
        description: "有効なポイント数が設定されていません",
        variant: "destructive",
      })
      return
    }

    setIsBulkAdding(true)
    try {
      const res = await fetch("/api/points/bulk-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignments,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        console.error("Bulk add API error:", {
          status: res.status,
          statusText: res.statusText,
          data,
        })
        throw new Error(data?.error || `一括ポイント付与に失敗しました（${res.status}）`)
      }

      // 失敗がある場合は詳細を表示
      if (data.failureCount > 0) {
        const failedStudents = data.results
          ?.filter((r: any) => !r.success)
          .map((r: any) => {
            const student = students.find((s) => s.id === r.studentId)
            return `${student?.name || r.studentId}: ${r.error || "エラー"}`
          })
          .join("\n")

        toast({
          title: "一部失敗",
          description: `${data.successCount}名に付与しましたが、${data.failureCount}名で失敗しました。\n${failedStudents || ""}`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "成功",
          description: data.message || `${data.successCount}名にポイントを付与しました`,
        })
      }

      // ダイアログを閉じて、データを再読み込み
      setBulkAddDialogOpen(false)
      setBulkAddPoints({})
      setBulkAddDescription("")
      setSelectedStudentIds(new Set())
      await loadStudents()
    } catch (e: any) {
      console.error("Bulk add error:", e)
      toast({
        title: "エラー",
        description: e?.message || "一括ポイント付与に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsBulkAdding(false)
    }
  }

  async function handleBulkSubtract() {
    if (selectedStudentIds.size === 0) {
      toast({
        title: "エラー",
        description: "少なくとも1名の生徒を選択してください",
        variant: "destructive",
      })
      return
    }

    // 各生徒のポイント数を検証
    const assignments: Array<{ studentId: string; points: number; description?: string }> = []
    const errors: string[] = []

    selectedStudentIds.forEach((studentId) => {
      const pointsStr = bulkSubtractPoints[studentId] || ""
      const points = parseInt(pointsStr, 10)

      if (!pointsStr || isNaN(points) || points <= 0) {
        const student = students.find((s) => s.id === studentId)
        errors.push(`${student?.name || studentId}: ポイント数が無効です`)
        return
      }

      // 現在のポイント数を確認
      const student = students.find((s) => s.id === studentId)
      if (student && student.current_points < points) {
        errors.push(`${student.name}: ポイントが不足しています（現在: ${student.current_points}pt）`)
        return
      }

      assignments.push({
        studentId,
        points,
        description: bulkSubtractDescription || undefined,
      })
    })

    if (errors.length > 0) {
      toast({
        title: "エラー",
        description: errors.join("\n"),
        variant: "destructive",
      })
      return
    }

    if (assignments.length === 0) {
      toast({
        title: "エラー",
        description: "有効なポイント数が設定されていません",
        variant: "destructive",
      })
      return
    }

    setIsBulkSubtracting(true)
    try {
      const res = await fetch("/api/points/bulk-subtract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignments,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        console.error("Bulk subtract API error:", {
          status: res.status,
          statusText: res.statusText,
          data,
        })
        throw new Error(data?.error || `一括ポイント減算に失敗しました（${res.status}）`)
      }

      // 失敗がある場合は詳細を表示
      if (data.failureCount > 0) {
        const failedStudents = data.results
          ?.filter((r: any) => !r.success)
          .map((r: any) => {
            const student = students.find((s) => s.id === r.studentId)
            return `${student?.name || r.studentId}: ${r.error || "エラー"}`
          })
          .join("\n")

        toast({
          title: "一部失敗",
          description: `${data.successCount}名から減算しましたが、${data.failureCount}名で失敗しました。\n${failedStudents || ""}`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "成功",
          description: data.message || `${data.successCount}名からポイントを減算しました`,
        })
      }

      // ダイアログを閉じて、データを再読み込み
      setBulkSubtractDialogOpen(false)
      setBulkSubtractPoints({})
      setBulkSubtractDescription("")
      setSelectedStudentIds(new Set())
      await loadStudents()
    } catch (e: any) {
      console.error("Bulk subtract error:", e)
      toast({
        title: "エラー",
        description: e?.message || "一括ポイント減算に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsBulkSubtracting(false)
    }
  }

  async function loadPointHistory() {
    try {
      const now = new Date()
      let startDate: Date

      switch (selectedPeriod) {
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1)
          break
      }

      // 全生徒分の履歴を取得（studentIdを指定しない）
      const res = await fetch(
        `/api/points/history?startDate=${startDate.toISOString()}&endDate=${now.toISOString()}&type=all`,
        { cache: "no-store" }
      )
      const data = await res.json()

      if (res.ok && data?.ok && data?.transactions) {
        // 日付ごとに集計
        const historyMap = new Map<string, PointHistory>()

        data.transactions.forEach((transaction: any) => {
          const date = new Date(transaction.createdAt).toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
          if (!historyMap.has(date)) {
            historyMap.set(date, {
              date,
              total: 0,
              entry: 0,
              bonus: 0,
              consumption: 0,
              admin_add: 0,
              admin_subtract: 0,
            })
          }

          const dayData = historyMap.get(date)!
          if (transaction.points > 0) {
            dayData.total += transaction.points
            if (transaction.transactionType === "entry") dayData.entry += transaction.points
            else if (transaction.transactionType === "bonus") dayData.bonus += transaction.points
            else if (transaction.transactionType === "admin_add") dayData.admin_add += transaction.points
          } else {
            const absPoints = Math.abs(transaction.points)
            dayData.total -= absPoints
            if (transaction.transactionType === "admin_subtract") {
              dayData.admin_subtract += absPoints
            } else {
              dayData.consumption += absPoints
            }
          }
        })

        const history = Array.from(historyMap.values()).sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        )
        setPointHistory(history)
      }
    } catch (e: any) {
      console.error("Failed to load point history:", e)
    }
  }

  function buildExportHistoryUrl(period: "week" | "month" | "year") {
    const now = new Date()
    let startDate: Date

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      type: "all",
    })

    return `/api/points/export?${params.toString()}`
  }

  function handleExportHistory() {
    try {
      window.location.href = exportHistoryUrl
    } catch (e: any) {
      toast({
        title: "エラー",
        description: e?.message || "エクスポートに失敗しました",
        variant: "destructive",
      })
    }
  }

  function parseCsvRows(text: string) {
    const rows: string[][] = []
    let row: string[] = []
    let field = ""
    let inQuotes = false

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const next = text[i + 1]

      if (char === '"') {
        if (inQuotes && next === '"') {
          field += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
        continue
      }

      if (!inQuotes && (char === "\n" || char === "\r")) {
        if (char === "\r" && next === "\n") {
          i++
        }
        row.push(field)
        field = ""
        if (row.some((value) => value.trim() !== "")) {
          rows.push(row)
        }
        row = []
        continue
      }

      if (!inQuotes && char === ",") {
        row.push(field)
        field = ""
        continue
      }

      field += char
    }

    row.push(field)
    if (row.some((value) => value.trim() !== "")) {
      rows.push(row)
    }

    return rows
  }

  function handleDownloadPointsTemplate() {
    if (pointsCsvMode === "by_student" && students.length === 0) {
      toast({
        title: "エラー",
        description: "テンプレートを作成するための生徒データがありません",
        variant: "destructive",
      })
      return
    }

    const headers =
      pointsCsvMode === "by_student"
        ? ["student_id", "name", "points", "description"]
        : ["points", "description"]
    const rows =
      pointsCsvMode === "by_student"
        ? students.map((student) => [student.id, student.name, "", ""])
        : [["10", "テスト付与"]]
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `points_bulk_template_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  async function handleImportPointsCsv() {
    if (!pointsCsvFile) return

    setIsPointsCsvImporting(true)
    try {
      if (students.length === 0) {
        throw new Error("ポイント付与対象の生徒がいません")
      }

      const text = await pointsCsvFile.text()
      const rows = parseCsvRows(text)

      if (rows.length < 2) {
        throw new Error("CSVファイルが空か、ヘッダー行のみです")
      }

      const headers = rows[0].map((header) =>
        header.trim().replace(/^\uFEFF/, "").replace(/^"|"$/g, "")
      )

      const pointsIndex = headers.findIndex((header) => header.toLowerCase() === "points" || header === "ポイント")
      const descriptionIndex = headers.findIndex(
        (header) => header.toLowerCase() === "description" || header === "説明"
      )
      const studentIdIndex = headers.findIndex(
        (header) =>
          header.toLowerCase() === "student_id" ||
          header.toLowerCase() === "studentid" ||
          header === "生徒ID"
      )
      const nameIndex = headers.findIndex(
        (header) => header.toLowerCase() === "name" || header === "生徒名"
      )

      if (pointsIndex === -1) {
        throw new Error("必須項目（points）が見つかりません")
      }

      const dataRows = rows.slice(1).filter((row) => row.some((value) => value.trim() !== ""))
      if (dataRows.length === 0) {
        throw new Error("CSVにデータがありません")
      }

      let assignments: Array<{ studentId: string; points: number; description?: string }> = []

      if (pointsCsvMode === "all") {
        if (dataRows.length !== 1) {
          throw new Error("全員一括付与は1行のデータのみ対応しています")
        }

        const row = dataRows[0]
        const pointsValue = row[pointsIndex]?.trim().replace(/^"|"$/g, "")
        const points = parseInt(pointsValue || "", 10)

        if (!pointsValue || isNaN(points) || points <= 0) {
          throw new Error("ポイント数は1以上の数値である必要があります")
        }

        const description = descriptionIndex >= 0
          ? row[descriptionIndex]?.trim().replace(/^"|"$/g, "")
          : ""

        assignments = students.map((student) => ({
          studentId: student.id,
          points,
          description: description || undefined,
        }))
      } else {
        if (studentIdIndex === -1 && nameIndex === -1) {
          throw new Error("必須項目（student_id または name）が見つかりません")
        }

        const errors: string[] = []
        dataRows.forEach((row, idx) => {
          const rowNumber = idx + 2
          const pointsValue = row[pointsIndex]?.trim().replace(/^"|"$/g, "")
          if (!pointsValue) {
            return
          }

          const points = parseInt(pointsValue || "", 10)
          if (isNaN(points) || points <= 0) {
            errors.push(`行${rowNumber}: ポイント数が無効です`)
            return
          }

          const studentIdValue =
            studentIdIndex >= 0 ? row[studentIdIndex]?.trim().replace(/^"|"$/g, "") : ""
          const nameValue = nameIndex >= 0 ? row[nameIndex]?.trim().replace(/^"|"$/g, "") : ""

          let student: Student | undefined
          if (studentIdValue) {
            student = students.find((s) => s.id === studentIdValue)
            if (!student) {
              errors.push(`行${rowNumber}: 生徒IDが見つかりません（${studentIdValue}）`)
              return
            }
          } else if (nameValue) {
            const matches = students.filter((s) => s.name === nameValue)
            if (matches.length === 0) {
              errors.push(`行${rowNumber}: 生徒名が見つかりません（${nameValue}）`)
              return
            }
            if (matches.length > 1) {
              errors.push(`行${rowNumber}: 生徒名が重複しています（${nameValue}）`)
              return
            }
            student = matches[0]
          } else {
            errors.push(`行${rowNumber}: 生徒IDまたは生徒名が必要です`)
            return
          }

          const description = descriptionIndex >= 0
            ? row[descriptionIndex]?.trim().replace(/^"|"$/g, "")
            : ""

          assignments.push({
            studentId: student.id,
            points,
            description: description || undefined,
          })
        })

        if (errors.length > 0) {
          throw new Error(errors.join("\n"))
        }
      }

      if (assignments.length === 0) {
        throw new Error("付与対象がありません")
      }

      const res = await fetch("/api/points/bulk-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `一括ポイント付与に失敗しました（${res.status}）`)
      }

      if (data.failureCount > 0) {
        const failedStudents = data.results
          ?.filter((result: any) => !result.success)
          .map((result: any) => {
            const student = students.find((s) => s.id === result.studentId)
            return `${student?.name || result.studentId}: ${result.error || "エラー"}`
          })
          .join("\n")

        toast({
          title: "一部失敗",
          description: `${data.successCount}名に付与しましたが、${data.failureCount}名で失敗しました。\n${failedStudents || ""}`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "成功",
          description: data.message || `${data.successCount}名にポイントを付与しました`,
        })
      }

      setPointsCsvFile(null)
      if (pointsCsvInputRef.current) {
        pointsCsvInputRef.current.value = ""
      }
      await loadStudents()
    } catch (e: any) {
      toast({
        title: "エラー",
        description: e?.message || "CSVインポートに失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsPointsCsvImporting(false)
    }
  }

  async function handleSave() {
    try {
      const points = parseInt(entryPoints, 10)
      if (isNaN(points) || points < 0) {
        toast({
          title: "エラー",
          description: "ポイント数は0以上の数値である必要があります",
          variant: "destructive",
        })
        return
      }

      const res = await fetch("/api/point-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryPoints: points,
          dailyLimit: dailyLimit,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "保存に失敗しました")
      }

      toast({
        title: "設定を保存しました",
        description: "ポイント設定の変更が正常に保存されました。",
      })
    } catch (e: any) {
      toast({
        title: "エラー",
        description: e?.message || "保存に失敗しました",
        variant: "destructive",
      })
    }
  }

  const getClassLabel = (studentClass?: string) => {
    if (!studentClass) return "-"
    const classLabels: Record<string, string> = {
      kindergarten: "キンダー",
      beginner: "ビギナー",
      challenger: "チャレンジャー",
      creator: "クリエイター",
      innovator: "イノベーター",
    }
    return classLabels[studentClass] || studentClass
  }

  const totalPoints = students.reduce((sum, s) => sum + s.current_points, 0)
  const averagePoints = students.length > 0 ? Math.round(totalPoints / students.length) : 0
  const exportHistoryUrl = buildExportHistoryUrl(selectedPeriod)

  return (
    <AdminLayout pageTitle="ポイント管理" breadcrumbs={[{ label: "ポイント管理" }]}>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* 機能メニュー */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => window.location.href = "/admin/points/verify"}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="font-semibold">整合性チェック</h3>
                  <p className="text-sm text-muted-foreground">ポイントの整合性を検証・修正</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => window.location.href = "/admin/points/backup"}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Database className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="font-semibold">バックアップ・復元</h3>
                  <p className="text-sm text-muted-foreground">ポイント状態の保存・復元</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => window.location.href = "/admin/points/dashboard"}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div>
                  <h3 className="font-semibold">統計ダッシュボード</h3>
                  <p className="text-sm text-muted-foreground">ポイント運用の可視化</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* 統計サマリー */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総ポイント数</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPoints.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">全生徒の合計ポイント</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均ポイント</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averagePoints.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">生徒1人あたりの平均</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">対象生徒数</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{students.length}</div>
              <p className="text-xs text-muted-foreground">ポイント対象の生徒数</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>CSVインポート付与</CardTitle>
            <CardDescription>CSVをインポートしてポイントを付与します</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <Label>付与対象</Label>
                <Select
                  value={pointsCsvMode}
                  onValueChange={(value) => {
                    setPointsCsvMode(value as "all" | "by_student")
                    setPointsCsvFile(null)
                    if (pointsCsvInputRef.current) {
                      pointsCsvInputRef.current.value = ""
                    }
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="付与対象を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全員に付与</SelectItem>
                    <SelectItem value="by_student">CSVで指定</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadPointsTemplate}>
                <Download className="h-4 w-4" />
                テンプレートDL
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {pointsCsvMode === "by_student"
                ? "テンプレートに生徒一覧を出力します。points欄に数値を入れてアップロードしてください"
                : "フォーマットは1行のみ対応（points, description）"}
            </p>
            <div className="space-y-2">
              <Label htmlFor="points-csv-file">CSVファイルを選択</Label>
              <Input
                id="points-csv-file"
                type="file"
                accept=".csv"
                ref={pointsCsvInputRef}
                disabled={isPointsCsvImporting}
                onChange={(e) => setPointsCsvFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleImportPointsCsv}
                disabled={!pointsCsvFile || isPointsCsvImporting}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {isPointsCsvImporting ? "付与中..." : "CSVで一括付与"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ポイント推移グラフ */}
        <Card>
          <CardHeader>
            <CardTitle>ポイント推移</CardTitle>
            <CardDescription>期間別のポイント獲得・消費の推移を表示します</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex gap-2">
              <Button
                variant={selectedPeriod === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPeriod("week")}
              >
                週間
              </Button>
              <Button
                variant={selectedPeriod === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPeriod("month")}
              >
                月間
              </Button>
              <Button
                variant={selectedPeriod === "year" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPeriod("year")}
              >
                年間
              </Button>
            </div>
            {pointHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={pointHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="entry" stroke="#8884d8" name="入室" />
                  <Line type="monotone" dataKey="bonus" stroke="#82ca9d" name="ボーナス" />
                  <Line type="monotone" dataKey="admin_add" stroke="#ffc658" name="管理追加" />
                  <Line type="monotone" dataKey="admin_subtract" stroke="#ff6b6b" name="管理減算" />
                  <Line type="monotone" dataKey="consumption" stroke="#ff7300" name="消費" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                データがありません
              </div>
            )}
          </CardContent>
        </Card>

        {/* ポイントランキング */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>ポイントランキング</CardTitle>
                <CardDescription>生徒のポイント数ランキング</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={rankingType === "total" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRankingType("total")}
                >
                  総合
                </Button>
                <Button
                  variant={rankingType === "monthly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRankingType("monthly")}
                >
                  月内
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleExportHistory}
                >
                  <Download className="h-4 w-4" />
                  履歴エクスポート
                </Button>
                {selectedStudentIds.size > 0 && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setBulkAddDialogOpen(true)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      一括付与 ({selectedStudentIds.size}名)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBulkSubtractDialogOpen(true)}
                      className="gap-2"
                    >
                      <Minus className="h-4 w-4" />
                      一括減算 ({selectedStudentIds.size}名)
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">データがありません</div>
            ) : (
              <div className="space-y-4">
                {/* トップ3のビジュアル表示 */}
                <div className="grid gap-4 md:grid-cols-3">
                  {students.slice(0, 3).map((student, index) => {
                    const points = rankingType === "monthly" ? (student as any).monthly_points || 0 : student.current_points
                    return (
                      <Card key={student.id} className={index === 0 ? "border-primary" : ""}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant={index === 0 ? "default" : "secondary"}>
                                  {index + 1}位
                                </Badge>
                                <button
                                  onClick={() => handleStudentClick(student)}
                                  className="font-semibold hover:underline cursor-pointer"
                                >
                                  {student.name}
                                </button>
                              </div>
                              {student.class && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {getClassLabel(student.class)}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold">{points}</div>
                              <div className="text-xs text-muted-foreground">pt</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {/* 全員のランキングテーブル */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedStudentIds.size === students.length && students.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-16">順位</TableHead>
                      <TableHead>名前</TableHead>
                      <TableHead>クラス</TableHead>
                      <TableHead className="text-right">ポイント</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student, index) => {
                      const points = rankingType === "monthly" ? (student as any).monthly_points || 0 : student.current_points
                      const isSelected = selectedStudentIds.has(student.id)
                      return (
                        <TableRow key={student.id}>
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleSelectStudent(student.id, checked as boolean)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant={index < 3 ? "default" : "outline"}>{index + 1}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            <button
                              onClick={() => handleStudentClick(student)}
                              className="hover:underline cursor-pointer"
                            >
                              {student.name}
                            </button>
                          </TableCell>
                          <TableCell>{getClassLabel(student.class)}</TableCell>
                          <TableCell className="text-right font-semibold">{points} pt</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* セクション1: ポイント設定 */}
        <Card>
          <CardHeader>
            <CardTitle>ポイント設定</CardTitle>
            <CardDescription>入室時のポイント付与に関する設定を行います</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="entry-points">入室ポイント付与量</Label>
              <Input
                id="entry-points"
                type="number"
                min="0"
                value={entryPoints}
                onChange={(e) => setEntryPoints(e.target.value)}
                className="max-w-xs"
              />
              <p className="text-sm text-muted-foreground">入室1回あたりに付与するポイント数</p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="daily-limit" className="text-base">
                  1日1回制限
                </Label>
                <p className="text-sm text-muted-foreground">同じ日に複数回入室してもポイントは1回のみ付与されます</p>
              </div>
              <Switch id="daily-limit" checked={dailyLimit} onCheckedChange={setDailyLimit} />
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} size="sm" className="gap-2">
                <Save className="h-4 w-4" />
                設定を保存
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* セクション2: ポイントボーナス設定 */}
        <Card>
          <CardHeader>
            <CardTitle>ポイントボーナス設定</CardTitle>
            <CardDescription>クラスごとにボーナス閾値とボーナスポイント数を設定します</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-medium">クラス別設定</h3>
                <div className="grid gap-4 sm:grid-cols-5">
                  <Button
                    variant="outline"
                    className="h-auto flex-col gap-2 py-6"
                    onClick={() => setKindergartenBonusDialogOpen(true)}
                  >
                    <span className="font-semibold">キンダー</span>
                    <span className="text-xs text-muted-foreground">ボーナス閾値を設定</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex-col gap-2 py-6"
                    onClick={() => setBeginnerBonusDialogOpen(true)}
                  >
                    <span className="font-semibold">ビギナー</span>
                    <span className="text-xs text-muted-foreground">ボーナス閾値を設定</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex-col gap-2 py-6"
                    onClick={() => setChallengerBonusDialogOpen(true)}
                  >
                    <span className="font-semibold">チャレンジャー</span>
                    <span className="text-xs text-muted-foreground">ボーナス閾値を設定</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex-col gap-2 py-6"
                    onClick={() => setCreatorBonusDialogOpen(true)}
                  >
                    <span className="font-semibold">クリエイター</span>
                    <span className="text-xs text-muted-foreground">ボーナス閾値を設定</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex-col gap-2 py-6"
                    onClick={() => setInnovatorBonusDialogOpen(true)}
                  >
                    <span className="font-semibold">イノベーター</span>
                    <span className="text-xs text-muted-foreground">ボーナス閾値を設定</span>
                  </Button>
                </div>
            </div>
            <Alert>
              <AlertDescription className="text-sm">
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>新規登録時は、対応するクラスに紐づいた設定が適用されます</li>
                  <li>個別設定をしたユーザーは、クラスが変更されても個別設定が優先されます</li>
                  <li>優先度：個別設定 &gt; クラス設定</li>
                  <li>同月内で設定した回数入室すると、設定したボーナスポイント数が付与されます（1ヶ月に1回のみ）</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* ボーナス閾値設定ダイアログ（クラス別） */}
        <ClassBonusThresholdDialog
          open={kindergartenBonusDialogOpen}
          onOpenChange={setKindergartenBonusDialogOpen}
          class="kindergarten"
          classLabel="キンダー"
        />
        <ClassBonusThresholdDialog
          open={beginnerBonusDialogOpen}
          onOpenChange={setBeginnerBonusDialogOpen}
          class="beginner"
          classLabel="ビギナー"
        />
        <ClassBonusThresholdDialog
          open={challengerBonusDialogOpen}
          onOpenChange={setChallengerBonusDialogOpen}
          class="challenger"
          classLabel="チャレンジャー"
        />
        <ClassBonusThresholdDialog
          open={creatorBonusDialogOpen}
          onOpenChange={setCreatorBonusDialogOpen}
          class="creator"
          classLabel="クリエイター"
        />
        <ClassBonusThresholdDialog
          open={innovatorBonusDialogOpen}
          onOpenChange={setInnovatorBonusDialogOpen}
          class="innovator"
          classLabel="イノベーター"
        />


        {/* 一括ポイント付与ダイアログ */}
        <Dialog open={bulkAddDialogOpen} onOpenChange={setBulkAddDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>一括ポイント付与</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>説明（任意）</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      min="1"
                      placeholder="全員に設定"
                      className="w-32"
                      disabled={isBulkAdding}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const value = (e.target as HTMLInputElement).value
                          if (value) {
                            handleSetAllPoints(value)
                            ;(e.target as HTMLInputElement).value = ""
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBulkAdding}
                      onClick={() => {
                        const input = document.querySelector('input[placeholder="全員に設定"]') as HTMLInputElement
                        if (input?.value) {
                          handleSetAllPoints(input.value)
                          input.value = ""
                        }
                      }}
                    >
                      全員に適用
                    </Button>
                  </div>
                </div>
                <Textarea
                  id="bulk-add-description"
                  value={bulkAddDescription}
                  onChange={(e) => setBulkAddDescription(e.target.value)}
                  disabled={isBulkAdding}
                  placeholder="例: 第1回テスト加点"
                  rows={3}
                />
              </div>
              <div className="flex-1 overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>名前</TableHead>
                      <TableHead>クラス</TableHead>
                      <TableHead className="text-right">現在のポイント</TableHead>
                      <TableHead className="text-right w-32">付与ポイント</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from(selectedStudentIds)
                      .map((studentId) => students.find((s) => s.id === studentId))
                      .filter((s): s is Student => s !== undefined)
                      .map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{getClassLabel(student.class)}</TableCell>
                          <TableCell className="text-right">{student.current_points} pt</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={bulkAddPoints[student.id] || ""}
                              onChange={(e) => handleBulkPointsChange(student.id, e.target.value)}
                              disabled={isBulkAdding}
                              placeholder="0"
                              className="text-right"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-sm text-muted-foreground">
                選択した{selectedStudentIds.size}名に個別にポイントを付与できます
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkAddDialogOpen(false)} disabled={isBulkAdding}>
                キャンセル
              </Button>
              <Button onClick={handleBulkAdd} disabled={isBulkAdding}>
                {isBulkAdding ? "付与中..." : "付与する"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 一括ポイント減算ダイアログ */}
        <Dialog open={bulkSubtractDialogOpen} onOpenChange={setBulkSubtractDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>一括ポイント減算</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>説明（任意）</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      min="1"
                      placeholder="全員に設定（減算）"
                      className="w-32"
                      disabled={isBulkSubtracting}
                      id="bulk-subtract-all-input"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const value = (e.target as HTMLInputElement).value
                          if (value) {
                            handleSetAllSubtractPoints(value)
                            ;(e.target as HTMLInputElement).value = ""
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBulkSubtracting}
                      onClick={() => {
                        const input = document.getElementById("bulk-subtract-all-input") as HTMLInputElement
                        if (input?.value) {
                          handleSetAllSubtractPoints(input.value)
                          input.value = ""
                        }
                      }}
                    >
                      全員に適用
                    </Button>
                  </div>
                </div>
                <Textarea
                  id="bulk-subtract-description"
                  value={bulkSubtractDescription}
                  onChange={(e) => setBulkSubtractDescription(e.target.value)}
                  disabled={isBulkSubtracting}
                  placeholder="例: 景品と交換、キャンペーン対応、返金処理"
                  rows={3}
                />
              </div>
              <div className="flex-1 overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>名前</TableHead>
                      <TableHead>クラス</TableHead>
                      <TableHead className="text-right">現在のポイント</TableHead>
                      <TableHead className="text-right w-32">減算ポイント</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from(selectedStudentIds)
                      .map((studentId) => students.find((s) => s.id === studentId))
                      .filter((s): s is Student => s !== undefined)
                      .map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{getClassLabel(student.class)}</TableCell>
                          <TableCell className="text-right">{student.current_points} pt</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              max={student.current_points}
                              value={bulkSubtractPoints[student.id] || ""}
                              onChange={(e) => handleBulkSubtractPointsChange(student.id, e.target.value)}
                              disabled={isBulkSubtracting}
                              placeholder="0"
                              className="text-right"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-sm text-muted-foreground">
                選択した{selectedStudentIds.size}名から個別にポイントを減算できます
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkSubtractDialogOpen(false)} disabled={isBulkSubtracting}>
                キャンセル
              </Button>
              <Button onClick={handleBulkSubtract} disabled={isBulkSubtracting} variant="destructive">
                {isBulkSubtracting ? "減算中..." : "減算する"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 生徒のポイント履歴ダイアログ */}
        <Dialog open={studentHistoryDialogOpen} onOpenChange={setStudentHistoryDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {selectedStudent?.name}さんのポイント履歴
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
              {isLoadingHistory ? (
                <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
              ) : studentPointTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">ポイント履歴がありません</div>
              ) : (
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
                    {studentPointTransactions.map((transaction: any) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {new Date(transaction.createdAt).toLocaleString("ja-JP", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          {transaction.transactionType === "entry"
                            ? "入室"
                            : transaction.transactionType === "bonus"
                            ? "ボーナス"
                            : transaction.transactionType === "consumption"
                            ? "消費"
                            : transaction.transactionType === "admin_add"
                            ? "管理追加"
                            : transaction.transactionType === "admin_subtract"
                            ? "管理減算"
                            : transaction.transactionType}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            transaction.points > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {transaction.points > 0 ? "+" : ""}
                          {transaction.points} pt
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {transaction.description || "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {transaction.adminName || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStudentHistoryDialogOpen(false)}>
                閉じる
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
