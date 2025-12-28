"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Download, Search, Eye, UserPlus, Pencil, Trash2, CreditCard, Upload, FileDown } from "lucide-react"

type StudentStatus = "active" | "suspended" | "withdrawn" | "graduated"
type StudentClass = "kindergarten" | "beginner" | "challenger" | "creator" | "innovator"
type EventType = "entry" | "exit" | "no_log"
type UserRole = "student" | "part_time" | "full_time"

interface NotificationRecipient {
  id: string
  name: string
}

interface Student {
  id: string
  name: string
  grade?: string
  status: StudentStatus
  class?: StudentClass
  role?: UserRole
  cardId?: string
  card_registered?: boolean
  card_active?: boolean
  card_token?: string | null
  card_token_id?: string | null
  lastEvent?: EventType
  lastEventTime?: string
  notificationCount: number
  notificationRecipients?: NotificationRecipient[]
}

export default function StudentsPage() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isCardRegisterDialogOpen, setIsCardRegisterDialogOpen] = useState(false)
  const [isCardDeleteDialogOpen, setIsCardDeleteDialogOpen] = useState(false)
  const [isBulkImportDialogOpen, setIsBulkImportDialogOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [registeringCardStudent, setRegisteringCardStudent] = useState<Student | null>(null)
  const [deletingCardStudent, setDeletingCardStudent] = useState<Student | null>(null)
  const [nfcStatus, setNfcStatus] = useState<"idle" | "manual" | "issuing" | "writing" | "success" | "error">("idle")
  const [nfcError, setNfcError] = useState<string>("")
  const [registeredToken, setRegisteredToken] = useState<string>("")
  const [manualCardId, setManualCardId] = useState<string>("")
  const [newStudent, setNewStudent] = useState({
    name: "",
    grade: "",
    status: "active" as StudentStatus,
    class: undefined as StudentClass | undefined,
    role: "student" as UserRole,
    cardId: "",
  })

  async function loadStudents() {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/students", { cache: "no-store" })
      const data = await res.json()

      if (!res.ok || !data?.ok) {
        const errorMessage = typeof data?.error === "string" 
          ? data.error 
          : data?.error?.message || String(data?.error) || "Failed to load students";
        throw new Error(errorMessage);
      }

      const apiStudents: Array<{
        id: string | number
        name: string
        grade?: string | number | null
        status?: "active" | "suspended" | "withdrawn" | "graduated"
        class?: string | null
        role?: string | null
        card_id?: string | null
        card_registered?: boolean
        card_active?: boolean
        card_token?: string | null
        card_token_id?: string | null
        last_event_type?: string | null
        last_event_timestamp?: string | null
        created_at?: string | null
      }> = data.students ?? []

      // ★UIの Student 型に"寄せる"。未実装列は埋める。
      const mapped: Student[] = apiStudents.map((s) => ({
        id: String(s.id), // 確実に文字列化
        name: s.name ?? "",
        grade: s.grade ? String(s.grade) : undefined,
        status: (s.status ?? "active") as StudentStatus,
        class: s.class ? (s.class as StudentClass) : undefined, // DBから取得したclassを反映
        role: s.role ? (s.role as UserRole) : "student", // デフォルトはstudent
        cardId: s.card_id || undefined,
        card_registered: s.card_registered ?? false,
        card_active: s.card_active ?? false,
        card_token: s.card_token || undefined,
        card_token_id: s.card_token_id || undefined,
        lastEvent: s.last_event_type ? (s.last_event_type as EventType) : undefined,
        lastEventTime: s.last_event_timestamp ? formatDateTime(s.last_event_timestamp) : undefined,
        notificationCount: 0, // DB未実装なら 0
        notificationRecipients: [], // DB未実装なら空配列
      }))

      setStudents(mapped)
    } catch (e: any) {
      const errorMessage = e?.message || String(e) || "Unknown error";
      setError(errorMessage);
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStudents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || student.status === statusFilter
    return matchesSearch && matchesStatus
  })

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
        return "secondary"
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
    if (!role) return "生徒"
    switch (role) {
      case "student":
        return "生徒"
      case "part_time":
        return "アルバイト"
      case "full_time":
        return "正社員"
    }
  }

  const getEventLabel = (event?: EventType) => {
    if (!event) return "ログ無し"
    switch (event) {
      case "entry":
        return "入室"
      case "exit":
        return "退室"
      case "no_log":
        return "ログ無し"
    }
  }

  // 日時を24時間表記（秒まで）でフォーマット
  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    const seconds = String(date.getSeconds()).padStart(2, "0")
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  const handleRowClick = (studentId: string) => {
    router.push(`/admin/students/${studentId}`)
  }

  const handleAddStudent = async () => {
    if (!newStudent.name.trim()) return

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStudent.name.trim(),
          grade: newStudent.grade.trim() || null,
          class: newStudent.class || null,
          role: newStudent.role,
          card_id: newStudent.cardId.trim() || null,
        }),
      })
      const data = await res.json()

      if (!res.ok || !data?.ok) {
        const errorMessage = typeof data?.error === "string" 
          ? data.error 
          : data?.error?.message || String(data?.error) || "Failed to create student";
        throw new Error(errorMessage);
      }

      // ダイアログ閉じる
      setIsAddDialogOpen(false)

      // 入力リセット
      setNewStudent({ name: "", grade: "", status: "active", class: undefined, role: "student", cardId: "" })

      // 一覧更新
      await loadStudents()
    } catch (e: any) {
      const errorMessage = e?.message || String(e) || "Failed to create student";
      alert(errorMessage);
    }
  }

  const handleEditStudent = (student: Student) => {
    setEditingStudent({
      ...student,
      notificationRecipients: student.notificationRecipients || [],
    })
    setIsEditDialogOpen(true)
  }

  const handleAddNotificationRecipient = () => {
    if (!editingStudent) return
    const newRecipient: NotificationRecipient = {
      id: Date.now().toString(),
      name: "",
    }
    setEditingStudent({
      ...editingStudent,
      notificationRecipients: [...(editingStudent.notificationRecipients || []), newRecipient],
    })
  }

  const handleRemoveNotificationRecipient = (recipientId: string) => {
    if (!editingStudent) return
    setEditingStudent({
      ...editingStudent,
      notificationRecipients: editingStudent.notificationRecipients?.filter((r) => r.id !== recipientId) || [],
    })
  }

  const handleUpdateNotificationRecipient = (recipientId: string, name: string) => {
    if (!editingStudent) return
    setEditingStudent({
      ...editingStudent,
      notificationRecipients:
        editingStudent.notificationRecipients?.map((r) => (r.id === recipientId ? { ...r, name } : r)) || [],
    })
  }

  const handleUpdateStudent = async () => {
    if (!editingStudent) return

    try {
      const res = await fetch(`/api/students/${editingStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingStudent.name.trim(),
          grade: editingStudent.grade?.trim() || null,
          class: editingStudent.class || null,
          status: editingStudent.status,
          role: editingStudent.role || "student",
          card_id: editingStudent.cardId?.trim() || null,
        }),
      })
      const data = await res.json()

      if (!res.ok || !data?.ok) {
        const errorMessage = typeof data?.error === "string" 
          ? data.error 
          : data?.error?.message || String(data?.error) || "Failed to update student";
        throw new Error(errorMessage);
      }

      // ダイアログ閉じる
      setIsEditDialogOpen(false)
      setEditingStudent(null)

      // 一覧更新
      await loadStudents()
    } catch (e: any) {
      const errorMessage = e?.message || String(e) || "Failed to update student";
      alert(errorMessage);
    }
  }

  const handleCancelEdit = () => {
    setIsEditDialogOpen(false)
    setEditingStudent(null)
  }

  const handleDeleteStudent = (student: Student) => {
    setDeletingStudent(student)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingStudent) return

    try {
      const res = await fetch(`/api/students?id=${deletingStudent.id}`, {
        method: "DELETE",
      })
      const data = await res.json()

      if (!res.ok || !data?.ok) {
        const errorMessage = typeof data?.error === "string" 
          ? data.error 
          : data?.error?.message || String(data?.error) || "Failed to delete student";
        throw new Error(errorMessage);
      }

      // ダイアログ閉じる
      setIsDeleteDialogOpen(false)
      setDeletingStudent(null)

      // 一覧更新
      await loadStudents()
    } catch (e: any) {
      const errorMessage = e?.message || String(e) || "Failed to delete student";
      alert(errorMessage);
    }
  }

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false)
    setDeletingStudent(null)
  }

  const handleRegisterCard = (student: Student) => {
    setRegisteringCardStudent(student)
    setIsCardRegisterDialogOpen(true)
    setNfcStatus("idle")
    setNfcError("")
    setRegisteredToken("")
  }

  const handleCancelCardRegister = () => {
    setIsCardRegisterDialogOpen(false)
    setRegisteringCardStudent(null)
    setNfcStatus("idle")
    setNfcError("")
    setRegisteredToken("")
    setManualCardId("")
  }

  const handleManualCardIdSubmit = async () => {
    if (!registeringCardStudent || !manualCardId.trim()) return

    try {
      setNfcStatus("writing")
      setNfcError("")

      const updateRes = await fetch(`/api/students/${registeringCardStudent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: manualCardId.trim() }),
      })
      const updateData = await updateRes.json()

      if (!updateRes.ok || !updateData?.ok) {
        throw new Error(updateData?.error || "カード登録に失敗しました")
      }

      setNfcStatus("success")
      setRegisteredToken(manualCardId.trim())
      await loadStudents()
    } catch (e: any) {
      setNfcStatus("error")
      const errorMessage = e?.message || String(e) || "カード登録に失敗しました"
      setNfcError(errorMessage)
    }
  }

  const handleStartCardWrite = async () => {
    if (!registeringCardStudent) return

    // Web NFC対応チェック
    if (!("NDEFReader" in window)) {
      setNfcStatus("error")
      setNfcError("この端末/ブラウザはNFC読み取りに対応していません（Android Chrome推奨）")
      return
    }

    // HTTPS チェック（localhost除く）
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      setNfcStatus("error")
      setNfcError("HTTPS環境で実行してください")
      return
    }

    try {
      setNfcStatus("issuing")
      setNfcError("")

      // 1. NFCカードのシリアル番号を読み取る
      const ndef = new (window as any).NDEFReader()
      await ndef.scan()

      console.log("NFC scan started, waiting for card...")

      let isProcessing = false // 重複処理を防ぐフラグ

      // タイムアウト設定（20秒）
      const timeoutId = setTimeout(() => {
        if (!isProcessing) {
          setNfcStatus("error")
          setNfcError("タイムアウトしました。もう一度お試しください。\n※ カードは1-2秒タッチして離してください。")
        }
      }, 20000)

      // カード処理の共通ハンドラ
      const processCard = async (serialNumber: string) => {
        if (isProcessing) {
          console.log("Already processing, skipping...")
          return
        }

        isProcessing = true
        clearTimeout(timeoutId)

        try {
          console.log("Card detected! Serial:", serialNumber)

          if (!serialNumber) {
            throw new Error("カードのシリアル番号を読み取れませんでした")
          }

          setNfcStatus("writing")
          setRegisteredToken(serialNumber)

          // シリアル番号を生徒に紐付ける
          const updateRes = await fetch(`/api/students/${registeringCardStudent.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cardId: serialNumber }),
          })
          const updateData = await updateRes.json()

          if (!updateRes.ok || !updateData?.ok) {
            throw new Error(updateData?.error || "カード登録に失敗しました")
          }

          // 成功
          setNfcStatus("success")
          console.log("Card registered successfully!")

          // 一覧を更新
          await loadStudents()
        } catch (e: any) {
          setNfcStatus("error")
          const errorMessage = e?.message || String(e) || "カード登録に失敗しました"
          setNfcError(errorMessage)
          console.error("Card registration error:", e)
        }
      }

      // reading イベント（NDEF対応カード）
      ndef.addEventListener("reading", async (event: any) => {
        console.log("Reading event:", event)
        const { serialNumber } = event
        await processCard(serialNumber)
      })

      // readingerror イベント（NDEF非対応カード: Suica, マイナンバーカード等）
      ndef.addEventListener("readingerror", async (event: any) => {
        console.log("Reading error event (NDEF not supported, but serial number available):", event)
        const { serialNumber } = event
        if (serialNumber) {
          console.log("Serial number from error event:", serialNumber)
          await processCard(serialNumber)
        } else {
          console.error("No serial number in error event")
          setNfcStatus("error")
          setNfcError("カードのシリアル番号を読み取れませんでした。")
        }
      })
    } catch (e: any) {
      setNfcStatus("error")
      const errorMessage = e?.message || String(e) || "カード登録に失敗しました"
      setNfcError(errorMessage)
      console.error("NFC scan error:", e)
    }
  }

  const handleDisableToken = async () => {
    if (!registeredToken) return

    try {
      const res = await fetch("/api/cards/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: registeredToken }),
      })
      const data = await res.json()

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "トークン無効化に失敗しました")
      }

      alert("トークンを無効化しました")
      handleCancelCardRegister()
    } catch (e: any) {
      alert(e?.message || "トークン無効化に失敗しました")
    }
  }

  const handleDeleteCard = (student: Student) => {
    setDeletingCardStudent(student)
    setIsCardDeleteDialogOpen(true)
  }

  const handleConfirmDeleteCard = async () => {
    if (!deletingCardStudent) return

    try {
      const res = await fetch(`/api/cards/delete?studentId=${deletingCardStudent.id}`, {
        method: "DELETE",
      })
      const data = await res.json()

      if (!res.ok || !data?.ok) {
        const errorMessage = typeof data?.error === "string" 
          ? data.error 
          : data?.error?.message || String(data?.error) || "カード登録の削除に失敗しました";
        throw new Error(errorMessage);
      }

      // ダイアログ閉じる
      setIsCardDeleteDialogOpen(false)
      setDeletingCardStudent(null)

      // 一覧更新
      await loadStudents()
    } catch (e: any) {
      const errorMessage = e?.message || String(e) || "カード登録の削除に失敗しました";
      alert(errorMessage);
    }
  }

  const handleCancelDeleteCard = () => {
    setIsCardDeleteDialogOpen(false)
    setDeletingCardStudent(null)
  }

  const handleExportCSV = () => {
    const headers = ["ユーザー名", "属性", "学年", "ステータス", "クラス", "カードID", "最終イベント", "最終イベント日時"]
    const csvContent = [
      headers.join(","),
      ...filteredStudents.map((student) =>
        [
          `"${student.name}"`,
          `"${getRoleLabel(student.role)}"`,
          student.grade || "",
          `"${getStatusLabel(student.status)}"`,
          `"${getClassLabel(student.class)}"`,
          student.cardId || "",
          `"${getEventLabel(student.lastEvent)}"`,
          student.lastEventTime || "",
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `students_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
  }

  const handleDownloadTemplate = () => {
    const headers = ["name", "role", "status", "grade", "class", "card_id"]
    const exampleRows = [
      ["山田太郎", "student", "active", "小学3年", "beginner", ""],
      ["佐藤花子", "part_time", "active", "", "creator", "CARD-001"],
      ["鈴木一郎", "full_time", "active", "", "", ""],
    ]
    const csvContent = [
      headers.join(","),
      ...exampleRows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `students_template_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
  }

  const handleBulkImport = async () => {
    if (!csvFile) return

    setIsUploading(true)
    setUploadError(null)
    setUploadSuccess(false)
    setUploadResult(null)

    try {
      // CSVファイルを読み込む
      const text = await csvFile.text()
      const lines = text.split("\n").filter((line) => line.trim())
      
      if (lines.length < 2) {
        throw new Error("CSVファイルが空か、ヘッダー行のみです")
      }

      // ヘッダー行を解析
      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""))
      const nameIndex = headers.findIndex((h) => h.toLowerCase() === "name" || h === "ユーザー名")
      const roleIndex = headers.findIndex((h) => h.toLowerCase() === "role" || h === "属性")
      const statusIndex = headers.findIndex((h) => h.toLowerCase() === "status" || h === "ステータス")
      const gradeIndex = headers.findIndex((h) => h.toLowerCase() === "grade" || h === "学年")
      const classIndex = headers.findIndex((h) => h.toLowerCase() === "class" || h === "クラス")
      const cardIdIndex = headers.findIndex((h) => h.toLowerCase() === "card_id" || h === "カードID")

      if (nameIndex === -1 || roleIndex === -1 || statusIndex === -1) {
        throw new Error("必須項目（name, role, status）が見つかりません")
      }

      // データ行を解析
      const students: Array<{
        name: string
        role: string
        status: string
        grade?: string
        class?: string
        card_id?: string
      }> = []

      const errors: string[] = []

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
        
        const name = values[nameIndex]?.trim()
        const role = values[roleIndex]?.trim()
        const status = values[statusIndex]?.trim()

        if (!name || !role || !status) {
          errors.push(`行${i + 1}: 必須項目が不足しています`)
          continue
        }

        // 属性の変換（日本語→英語）
        let roleValue = role.toLowerCase()
        if (role === "生徒") roleValue = "student"
        else if (role === "アルバイト") roleValue = "part_time"
        else if (role === "正社員") roleValue = "full_time"

        if (!["student", "part_time", "full_time"].includes(roleValue)) {
          errors.push(`行${i + 1}: 属性が不正です（${role}）`)
          continue
        }

        // ステータスの変換（日本語→英語）
        let statusValue = status.toLowerCase()
        if (status === "在籍") statusValue = "active"
        else if (status === "休会") statusValue = "suspended"
        else if (status === "退会") statusValue = "withdrawn"
        else if (status === "卒業") statusValue = "graduated"

        if (!["active", "suspended", "withdrawn", "graduated"].includes(statusValue)) {
          errors.push(`行${i + 1}: ステータスが不正です（${status}）`)
          continue
        }

        // クラスの変換（日本語→英語）
        let classValue: string | undefined = values[classIndex]?.trim()
        if (classValue) {
          if (classValue === "キンダー") classValue = "kindergarten"
          else if (classValue === "ビギナー") classValue = "beginner"
          else if (classValue === "チャレンジャー") classValue = "challenger"
          else if (classValue === "クリエイター") classValue = "creator"
          else if (classValue === "イノベーター") classValue = "innovator"
          else if (!["kindergarten", "beginner", "challenger", "creator", "innovator"].includes(classValue)) {
            errors.push(`行${i + 1}: クラスが不正です（${values[classIndex]}）`)
            classValue = undefined
          }
        }

        students.push({
          name,
          role: roleValue,
          status: statusValue,
          grade: values[gradeIndex]?.trim() || undefined,
          class: classValue,
          card_id: values[cardIdIndex]?.trim() || undefined,
        })
      }

      if (students.length === 0) {
        throw new Error("有効なデータがありません")
      }

      // APIに送信
      const res = await fetch("/api/students/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students }),
      })
      const data = await res.json()

      if (!res.ok || !data?.ok) {
        const errorMessage = typeof data?.error === "string" 
          ? data.error 
          : data?.error?.message || String(data?.error) || "一括登録に失敗しました"
        throw new Error(errorMessage)
      }

      setUploadSuccess(true)
      setUploadResult({
        success: data.success || students.length,
        failed: data.failed || errors.length,
        errors: errors.length > 0 ? errors : (data.errors || []),
      })

      // 一覧を更新
      await loadStudents()
    } catch (e: any) {
      const errorMessage = e?.message || String(e) || "一括登録に失敗しました"
      setUploadError(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <AdminLayout
      pageTitle="ユーザー一覧"
      breadcrumbs={[{ label: "ユーザー一覧" }]}
      actions={
        <>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">CSV出力</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsBulkImportDialogOpen(true)}>
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">CSVで一括登録</span>
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">ユーザー追加</span>
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Search and Filter Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ユーザー名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="active">在籍</SelectItem>
                  <SelectItem value="suspended">休会</SelectItem>
                  <SelectItem value="withdrawn">退会</SelectItem>
                  <SelectItem value="graduated">卒業</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Loading and Error Messages */}
        {isLoading && <div className="text-sm text-muted-foreground">読み込み中…</div>}
        {error && <div className="text-sm text-red-600">エラー: {error}</div>}

        {/* Students Table */}
        <Card>
          <CardContent className="p-0">
            {filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <UserPlus className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">ユーザーがいません</h3>
                <p className="mb-4 text-sm text-muted-foreground">ユーザーを追加して管理を始めましょう</p>
                <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  ユーザーを追加
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ユーザー名</TableHead>
                      <TableHead>属性</TableHead>
                      <TableHead>学年</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>クラス</TableHead>
                      <TableHead>カード登録</TableHead>
                      <TableHead>カードID</TableHead>
                      <TableHead>最終イベント</TableHead>
                      <TableHead>最終イベント日時</TableHead>
                      <TableHead className="text-center">通知先人数</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow
                        key={student.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(student.id)}
                      >
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getRoleLabel(student.role)}</Badge>
                        </TableCell>
                        <TableCell>{student.grade || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(student.status)}>{getStatusLabel(student.status)}</Badge>
                        </TableCell>
                        <TableCell>{getClassLabel(student.class)}</TableCell>
                        <TableCell>
                          {student.card_registered ? (
                            <div className="flex items-center gap-2">
                              <Badge variant={student.card_active ? "default" : "secondary"}>
                                {student.card_active ? "登録済み" : "無効"}
                              </Badge>
                            </div>
                          ) : (
                            <Badge variant="outline">未登録</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{student.cardId || "-"}</TableCell>
                        <TableCell>{getEventLabel(student.lastEvent)}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{student.lastEventTime || "-"}</TableCell>
                        <TableCell className="text-center">{student.notificationCount}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {student.card_registered ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRegisterCard(student)
                                  }}
                                >
                                  <CreditCard className="h-4 w-4" />
                                  変更
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-2 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteCard(student)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  削除
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRegisterCard(student)
                                }}
                              >
                                <CreditCard className="h-4 w-4" />
                                カード登録
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-2"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditStudent(student)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                              編集
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-2"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRowClick(student.id)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                              詳細
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-2 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteStudent(student)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              削除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Student Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ユーザーを追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">ユーザー名 *</Label>
              <Input
                id="name"
                placeholder="例: 山田太郎"
                value={newStudent.name}
                onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade">学年（任意）</Label>
              <Input
                id="grade"
                placeholder="例: 小学3年"
                value={newStudent.grade}
                onChange={(e) => setNewStudent({ ...newStudent, grade: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">属性 *</Label>
              <Select
                value={newStudent.role}
                onValueChange={(value) => setNewStudent({ ...newStudent, role: value as UserRole })}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">生徒</SelectItem>
                  <SelectItem value="part_time">アルバイト</SelectItem>
                  <SelectItem value="full_time">正社員</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">ステータス</Label>
              <Select
                value={newStudent.status}
                onValueChange={(value) => setNewStudent({ ...newStudent, status: value as StudentStatus })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">在籍</SelectItem>
                  <SelectItem value="suspended">休会</SelectItem>
                  <SelectItem value="withdrawn">退会</SelectItem>
                  <SelectItem value="graduated">卒業</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="class">クラス（任意）</Label>
              <Select
                value={newStudent.class || "none"}
                onValueChange={(value) =>
                  setNewStudent({ ...newStudent, class: value === "none" ? undefined : (value as StudentClass) })
                }
              >
                <SelectTrigger id="class">
                  <SelectValue placeholder="クラスを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">未選択</SelectItem>
                  <SelectItem value="kindergarten">キンダー</SelectItem>
                  <SelectItem value="beginner">ビギナー</SelectItem>
                  <SelectItem value="challenger">チャレンジャー</SelectItem>
                  <SelectItem value="creator">クリエイター</SelectItem>
                  <SelectItem value="innovator">イノベーター</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardId">カードID（任意）</Label>
              <Input
                id="cardId"
                placeholder="例: CARD-001"
                value={newStudent.cardId}
                onChange={(e) => setNewStudent({ ...newStudent, cardId: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleAddStudent} disabled={!newStudent.name.trim()}>
              追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleCancelEdit}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ユーザーを編集</DialogTitle>
          </DialogHeader>
          {editingStudent && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">ユーザー名 *</Label>
                <Input
                  id="edit-name"
                  placeholder="例: 山田太郎"
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-grade">学年（任意）</Label>
                <Input
                  id="edit-grade"
                  placeholder="例: 小学3年"
                  value={editingStudent.grade || ""}
                  onChange={(e) => setEditingStudent({ ...editingStudent, grade: e.target.value || undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-class">クラス（任意）</Label>
                <Select
                  value={editingStudent.class || "none"}
                  onValueChange={(value) =>
                    setEditingStudent({ ...editingStudent, class: value === "none" ? undefined : (value as StudentClass) })
                  }
                >
                  <SelectTrigger id="edit-class">
                    <SelectValue placeholder="クラスを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">未選択</SelectItem>
                    <SelectItem value="kindergarten">キンダー</SelectItem>
                    <SelectItem value="beginner">ビギナー</SelectItem>
                    <SelectItem value="challenger">チャレンジャー</SelectItem>
                    <SelectItem value="creator">クリエイター</SelectItem>
                    <SelectItem value="innovator">イノベーター</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">属性 *</Label>
                <Select
                  value={editingStudent.role || "student"}
                  onValueChange={(value) =>
                    setEditingStudent({ ...editingStudent, role: value as UserRole })
                  }
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">生徒</SelectItem>
                    <SelectItem value="part_time">アルバイト</SelectItem>
                    <SelectItem value="full_time">正社員</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">ステータス</Label>
                <Select
                  value={editingStudent.status}
                  onValueChange={(value) =>
                    setEditingStudent({ ...editingStudent, status: value as StudentStatus })
                  }
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">在籍</SelectItem>
                    <SelectItem value="suspended">休会</SelectItem>
                    <SelectItem value="withdrawn">退会</SelectItem>
                    <SelectItem value="graduated">卒業</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cardId">カードID（任意）</Label>
                <Input
                  id="edit-cardId"
                  placeholder="例: CARD-001"
                  value={editingStudent.cardId || ""}
                  onChange={(e) => setEditingStudent({ ...editingStudent, cardId: e.target.value || undefined })}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>通知先リスト（公式LINEと連携予定）</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleAddNotificationRecipient}
                  >
                    <Plus className="h-4 w-4" />
                    追加
                  </Button>
                </div>
                <div className="space-y-2 border rounded-md p-4">
                  {editingStudent.notificationRecipients && editingStudent.notificationRecipients.length > 0 ? (
                    editingStudent.notificationRecipients.map((recipient) => (
                      <div key={recipient.id} className="flex items-center gap-2">
                        <Input
                          placeholder="通知先の名前を入力"
                          value={recipient.name}
                          onChange={(e) => handleUpdateNotificationRecipient(recipient.id, e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveNotificationRecipient(recipient.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">通知先が登録されていません</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>
              キャンセル
            </Button>
            <Button onClick={handleUpdateStudent} disabled={!editingStudent?.name.trim()}>
              更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={handleCancelDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ユーザーを削除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {deletingStudent && (
              <p className="text-sm text-muted-foreground">
                「<span className="font-semibold text-foreground">{deletingStudent.name}</span>」を削除してもよろしいですか？
                <br />
                この操作は取り消せません。
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDelete}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NFC Card Register Dialog */}
      <Dialog open={isCardRegisterDialogOpen} onOpenChange={handleCancelCardRegister}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>NFCカード登録</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {registeringCardStudent && (
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-semibold">{registeringCardStudent.name}</span> さんにNFCカードを登録します。
                </p>
              </div>
            )}

            {nfcStatus === "idle" && (
              <div className="space-y-3">
                <div className="rounded-md bg-muted p-4 text-sm">
                  <p className="font-semibold mb-2">方法1: NFCで自動読み取り（Unit Link等のNDEF対応カード）</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Android端末（Chrome推奨）を用意してください</li>
                    <li>登録したいNFCカードを準備してください</li>
                    <li>「NFCで読み取り」ボタンを押してください</li>
                    <li>カードを端末にタッチしてください</li>
                  </ol>
                </div>
                <div className="rounded-md bg-yellow-50 p-4 text-sm">
                  <p className="font-semibold mb-2 text-yellow-900">⚠️ 注意: Suica、マイナンバーカード等は読み取れません</p>
                  <p className="text-xs text-yellow-800">
                    これらのカードを使用する場合は、「手動で入力」を選択してください。
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  ※ カードのシリアル番号（UID）を読み取って登録します。カードへの書き込みは行いません。
                </p>
              </div>
            )}

            {nfcStatus === "manual" && (
              <div className="space-y-3">
                <div className="rounded-md bg-muted p-4 text-sm">
                  <p className="font-semibold mb-2">カードIDを手動で入力</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Suica、マイナンバーカード等のカードIDを入力してください。
                  </p>
                  <Input
                    placeholder="例: 04:1a:2b:3c:4d:5e:6f"
                    value={manualCardId}
                    onChange={(e) => setManualCardId(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            )}

            {nfcStatus === "issuing" && (
              <div className="flex flex-col items-center gap-3 rounded-md bg-blue-50 p-6">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                <p className="text-sm font-semibold text-blue-900">カードを端末にタッチしてください</p>
                <p className="text-xs text-blue-700">シリアル番号を読み取り中...</p>
              </div>
            )}

            {nfcStatus === "writing" && (
              <div className="flex flex-col items-center gap-3 rounded-md bg-blue-50 p-6">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                <p className="text-sm font-semibold text-blue-900">登録中...</p>
                <p className="text-xs text-blue-700">サーバーに保存しています...</p>
              </div>
            )}

            {nfcStatus === "success" && (
              <div className="space-y-3">
                <div className="rounded-md bg-green-50 p-4">
                  <p className="text-sm font-semibold text-green-900 mb-2">✓ 登録完了</p>
                  <p className="text-xs text-green-700">
                    カードのシリアル番号を登録しました。
                  </p>
                  {registeredToken && (
                    <p className="text-xs text-green-700 mt-2 font-mono break-all">
                      カードID: {registeredToken}
                    </p>
                  )}
                </div>
              </div>
            )}

            {nfcStatus === "error" && (
              <div className="space-y-3">
                <div className="rounded-md bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-900 mb-2">✗ エラー</p>
                  <p className="text-xs text-red-700">{nfcError}</p>
                </div>
                {registeredToken && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisableToken}
                    className="w-full"
                  >
                    発行済みトークンを無効化
                  </Button>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            {nfcStatus === "idle" && (
              <>
                <Button variant="outline" onClick={handleCancelCardRegister}>
                  キャンセル
                </Button>
                <Button variant="outline" onClick={() => setNfcStatus("manual")}>
                  手動で入力
                </Button>
                <Button onClick={handleStartCardWrite}>NFCで読み取り</Button>
              </>
            )}
            {nfcStatus === "manual" && (
              <>
                <Button variant="outline" onClick={() => { setNfcStatus("idle"); setManualCardId(""); }}>
                  戻る
                </Button>
                <Button onClick={handleManualCardIdSubmit} disabled={!manualCardId.trim()}>
                  登録
                </Button>
              </>
            )}
            {(nfcStatus === "success" || nfcStatus === "error") && (
              <Button onClick={handleCancelCardRegister}>閉じる</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Bulk Import Dialog */}
      <Dialog open={isBulkImportDialogOpen} onOpenChange={setIsBulkImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>CSVで一括登録</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                CSVファイルをアップロードして、ユーザーを一括登録できます。
              </p>
              <div className="rounded-md bg-muted p-4">
                <p className="text-sm font-semibold mb-2">必須項目：</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>ユーザー名（name）</li>
                  <li>属性（role）：生徒 / アルバイト / 正社員</li>
                  <li>ステータス（status）：在籍 / 休会 / 退会 / 卒業</li>
                </ul>
                <p className="text-sm font-semibold mt-3 mb-2">任意項目：</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>学年（grade）</li>
                  <li>クラス（class）：キンダー / ビギナー / チャレンジャー / クリエイター / イノベーター</li>
                  <li>カードID（card_id）</li>
                </ul>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 w-full"
                onClick={handleDownloadTemplate}
              >
                <FileDown className="h-4 w-4" />
                テンプレートCSVをダウンロード
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="csv-file">CSVファイルを選択</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setCsvFile(file)
                    setUploadError(null)
                    setUploadSuccess(false)
                    setUploadResult(null)
                  }
                }}
              />
            </div>
            {uploadError && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-900 mb-2">エラー</p>
                <p className="text-xs text-red-700">{uploadError}</p>
              </div>
            )}
            {uploadSuccess && uploadResult && (
              <div className="rounded-md bg-green-50 p-4">
                <p className="text-sm font-semibold text-green-900 mb-2">登録完了</p>
                <p className="text-xs text-green-700">
                  成功: {uploadResult.success}件、失敗: {uploadResult.failed}件
                </p>
                {uploadResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-green-900">エラー詳細：</p>
                    <ul className="text-xs text-green-700 list-disc list-inside mt-1">
                      {uploadResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsBulkImportDialogOpen(false)
              setCsvFile(null)
              setUploadError(null)
              setUploadSuccess(false)
              setUploadResult(null)
            }}>
              キャンセル
            </Button>
            <Button
              onClick={handleBulkImport}
              disabled={!csvFile || isUploading}
            >
              {isUploading ? "登録中..." : "登録"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Card Confirmation Dialog */}
      <Dialog open={isCardDeleteDialogOpen} onOpenChange={handleCancelDeleteCard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>カード登録を削除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {deletingCardStudent && (
              <p className="text-sm text-muted-foreground">
                「<span className="font-semibold text-foreground">{deletingCardStudent.name}</span>」のカード登録を削除してもよろしいですか？
                <br />
                この操作により、カードの紐付けが削除されます。
                <br />
                この操作は取り消せません。
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDeleteCard}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteCard}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
