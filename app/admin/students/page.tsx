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
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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
  Plus,
  Download,
  Search,
  Eye,
  UserPlus,
  Pencil,
  Trash2,
  CreditCard,
  Upload,
  FileDown,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react"
import { NFC_CONSTANTS } from "@/lib/constants"

type StudentStatus = "active" | "suspended" | "withdrawn" | "graduated" | "disabled"
type StudentClass = "kindergarten" | "beginner" | "challenger" | "creator" | "innovator"
type EventType = "entry" | "exit" | "no_log"
type UserRole = "student" | "part_time" | "full_time"
type CardFilter = "registered" | "unregistered"
type SortDirection = "asc" | "desc"
type StudentSortKey =
  | "name"
  | "role"
  | "grade"
  | "status"
  | "class"
  | "cardRegistered"
  | "cardId"
  | "lastEvent"
  | "lastEventTime"
  | "notificationCount"

const DEFAULT_STATUS_FILTERS: StudentStatus[] = ["active"]
const DEFAULT_ROLE_FILTERS: UserRole[] = ["student", "part_time", "full_time"]
const DEFAULT_CARD_FILTERS: CardFilter[] = ["registered", "unregistered"]
const DEFAULT_EVENT_FILTERS: EventType[] = ["entry", "exit", "no_log"]

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
  has_custom_access_time?: boolean
  cardId?: string
  card_registered?: boolean
  card_active?: boolean
  card_token?: string | null
  card_token_id?: string | null
  lastEvent?: EventType
  lastEventTime?: string
  lastEventAt?: number
  notificationCount: number
  notificationRecipients?: NotificationRecipient[]
}

export default function StudentsPage() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilters, setStatusFilters] = useState<StudentStatus[]>([...DEFAULT_STATUS_FILTERS])
  const [roleFilters, setRoleFilters] = useState<UserRole[]>([...DEFAULT_ROLE_FILTERS])
  const [cardFilters, setCardFilters] = useState<CardFilter[]>([...DEFAULT_CARD_FILTERS])
  const [eventFilters, setEventFilters] = useState<EventType[]>([...DEFAULT_EVENT_FILTERS])
  const [sortConfig, setSortConfig] = useState<{ key: StudentSortKey | null; direction: SortDirection }>({
    key: null,
    direction: "asc",
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCardRegisterDialogOpen, setIsCardRegisterDialogOpen] = useState(false)
  const [isCardDeleteDialogOpen, setIsCardDeleteDialogOpen] = useState(false)
  const [isBulkImportDialogOpen, setIsBulkImportDialogOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)
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
    console.log("[Students Page] Loading students...");
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/students", { cache: "no-store" })
      const data = await res.json()
      console.log("[Students Page] Load students response:", { ok: data?.ok, count: data?.students?.length });

      if (!res.ok || !data?.ok) {
        const errorMessage = typeof data?.error === "string" 
          ? data.error 
          : data?.error?.message || String(data?.error) || "Failed to load students";
        console.error("[Students Page] Load students error:", errorMessage);
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
        has_custom_access_time?: boolean
        created_at?: string | null
      }> = data.students ?? []

      // ★UIの Student 型に"寄せる"。未実装列は埋める。
      const mapped: Student[] = apiStudents.map((s) => {
        const lastEventAtRaw = s.last_event_timestamp ? new Date(s.last_event_timestamp).getTime() : undefined
        const lastEventAt =
          lastEventAtRaw != null && !Number.isNaN(lastEventAtRaw) ? lastEventAtRaw : undefined
        return {
          id: String(s.id), // 確実に文字列化
          name: s.name ?? "",
          grade: s.grade ? String(s.grade) : undefined,
          status: (s.status ?? "active") as StudentStatus,
          class: s.class ? (s.class as StudentClass) : undefined, // DBから取得したclassを反映
          role: s.role ? (s.role as UserRole) : "student", // デフォルトはstudent
          has_custom_access_time: s.has_custom_access_time ?? false,
          cardId: s.card_id || undefined,
          card_registered: s.card_registered ?? false,
          card_active: s.card_active ?? false,
          card_token: s.card_token || undefined,
          card_token_id: s.card_token_id || undefined,
          lastEvent: s.last_event_type ? (s.last_event_type as EventType) : undefined,
          lastEventTime: s.last_event_timestamp ? formatDateTime(s.last_event_timestamp) : undefined,
          lastEventAt,
          notificationCount: 0, // DB未実装なら 0
          notificationRecipients: [], // DB未実装なら空配列
        }
      })

      console.log("[Students Page] Students loaded:", mapped.length);
      setStudents(mapped)
    } catch (e: any) {
      const errorMessage = e?.message || String(e) || "Unknown error";
      console.error("[Students Page] Load students exception:", errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStudents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilters, roleFilters, cardFilters, eventFilters])

  useEffect(() => {
    setCurrentPage(1)
  }, [pageSize])

  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilters.length === 0 || statusFilters.includes(student.status)
    const roleValue = (student.role || "student") as UserRole
    const matchesRole = roleFilters.length === 0 || roleFilters.includes(roleValue)
    const cardValue: CardFilter = student.card_registered ? "registered" : "unregistered"
    const matchesCard = cardFilters.length === 0 || cardFilters.includes(cardValue)
    const eventValue = (student.lastEvent || "no_log") as EventType
    const matchesEvent = eventFilters.length === 0 || eventFilters.includes(eventValue)
    return matchesSearch && matchesStatus && matchesRole && matchesCard && matchesEvent
  })

  const statusOrder: Record<StudentStatus, number> = {
    active: 1,
    suspended: 2,
    withdrawn: 3,
    graduated: 4,
    disabled: 5,
  }
  const roleOrder: Record<UserRole, number> = {
    student: 1,
    part_time: 2,
    full_time: 3,
  }
  const classOrder: Record<StudentClass, number> = {
    kindergarten: 1,
    beginner: 2,
    challenger: 3,
    creator: 4,
    innovator: 5,
  }
  const eventOrder: Record<EventType, number> = {
    entry: 1,
    exit: 2,
    no_log: 3,
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

  const compareBooleans = (a?: boolean, b?: boolean) => compareNumbers(a ? 1 : 0, b ? 1 : 0)

  const handleSort = (key: StudentSortKey) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" }
      }
      return { key, direction: "asc" }
    })
  }

  const getAriaSort = (key: StudentSortKey) => {
    if (sortConfig.key !== key) return "none"
    return sortConfig.direction === "asc" ? "ascending" : "descending"
  }

  const renderSortIcon = (key: StudentSortKey) => {
    if (sortConfig.key !== key) {
      return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="h-3.5 w-3.5 text-foreground" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-foreground" />
    )
  }

  const getSortButtonClass = (align: "left" | "center" | "right", key: StudentSortKey) => {
    const alignment = align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"
    const tone = sortConfig.key === key ? "text-foreground" : "text-foreground/70"
    return `flex w-full items-center gap-1 text-xs font-semibold transition-colors ${alignment} ${tone} hover:text-foreground`
  }

  const sortedStudents = sortConfig.key
    ? [...filteredStudents].sort((a, b) => {
        const direction = sortConfig.direction === "asc" ? 1 : -1
        switch (sortConfig.key) {
          case "name":
            return compareStrings(a.name, b.name) * direction
          case "role": {
            const aRole = (a.role || "student") as UserRole
            const bRole = (b.role || "student") as UserRole
            return compareNumbers(roleOrder[aRole], roleOrder[bRole]) * direction
          }
          case "grade":
            return compareStrings(a.grade, b.grade) * direction
          case "status":
            return compareNumbers(statusOrder[a.status], statusOrder[b.status]) * direction
          case "class":
            return compareNumbers(
              a.class ? classOrder[a.class] : undefined,
              b.class ? classOrder[b.class] : undefined,
            ) * direction
          case "cardRegistered":
            return compareBooleans(a.card_registered, b.card_registered) * direction
          case "cardId":
            return compareStrings(a.cardId, b.cardId) * direction
          case "lastEvent":
            return compareNumbers(
              a.lastEvent ? eventOrder[a.lastEvent] : undefined,
              b.lastEvent ? eventOrder[b.lastEvent] : undefined,
            ) * direction
          case "lastEventTime":
            return compareNumbers(a.lastEventAt, b.lastEventAt) * direction
          case "notificationCount":
            return compareNumbers(a.notificationCount, b.notificationCount) * direction
          default:
            return 0
        }
      })
    : filteredStudents

  const totalStudents = sortedStudents.length
  const totalPages = Math.max(1, Math.ceil(totalStudents / pageSize))
  const currentPageSafe = Math.min(currentPage, totalPages)
  const startIndex = totalStudents === 0 ? 0 : (currentPageSafe - 1) * pageSize + 1
  const endIndex = Math.min(totalStudents, currentPageSafe * pageSize)
  const paginatedStudents = sortedStudents.slice(
    (currentPageSafe - 1) * pageSize,
    currentPageSafe * pageSize,
  )

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
      case "disabled":
        return "利用停止"
    }
  }

  const getStatusVariant = (status: StudentStatus) => {
    switch (status) {
      case "active":
        return "status"
      case "suspended":
        return "neutral"
      case "withdrawn":
        return "neutral"
      case "graduated":
        return "neutral"
      case "disabled":
        return "danger"
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
      console.log("[Students Page] Adding student:", newStudent);
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

      if (!res.ok) {
        const errorText = await res.text();
        console.error("[Students Page] API error response:", errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `HTTP ${res.status}: ${res.statusText}` };
        }
        const errorMessage = typeof errorData?.error === "string" 
          ? errorData.error 
          : errorData?.error?.message || String(errorData?.error) || `HTTP ${res.status}: ${res.statusText}`;
        throw new Error(errorMessage);
      }

      const data = await res.json()
      console.log("[Students Page] API response:", data);

      if (!data?.ok) {
        const errorMessage = typeof data?.error === "string" 
          ? data.error 
          : data?.error?.message || String(data?.error) || "Failed to create student";
        throw new Error(errorMessage);
      }

      console.log("[Students Page] Student added successfully, refreshing list...");
      
      // ダイアログ閉じる
      setIsAddDialogOpen(false)

      // 入力リセット
      setNewStudent({ name: "", grade: "", status: "active", class: undefined, role: "student", cardId: "" })

      // 一覧更新
      await loadStudents()
      console.log("[Students Page] List refreshed after adding student");
    } catch (e: any) {
      const errorMessage = e?.message || String(e) || "Failed to create student";
      console.error("[Students Page] Error adding student:", errorMessage);
      alert(`エラー: ${errorMessage}`);
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

  const handleEditRoleChange = (value: string) => {
    if (!editingStudent) return
    const nextRole = value as UserRole

    if (editingStudent.has_custom_access_time) {
      const confirmed = window.confirm(
        "このユーザーは個別の開放時間が設定されています。属性を変更しても開放時間は個別設定のままです。属性のみ変更しますか？"
      )
      if (!confirmed) return
    }

    setEditingStudent({ ...editingStudent, role: nextRole })
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

      // シリアル番号の正規化（小文字に統一、前後の空白を削除）
      const normalizedCardId = manualCardId.trim().toLowerCase()

      const updateRes = await fetch(`/api/students/${registeringCardStudent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: normalizedCardId }),
      })
      const updateData = await updateRes.json()

      if (!updateRes.ok || !updateData?.ok) {
        throw new Error(updateData?.error || "カード登録に失敗しました")
      }

      setNfcStatus("success")
      setRegisteredToken(normalizedCardId)
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

      // タイムアウト設定
      const timeoutId = setTimeout(() => {
        if (!isProcessing) {
          setNfcStatus("error")
          setNfcError("タイムアウトしました。もう一度お試しください。\n※ カードは1-2秒タッチして離してください。")
        }
      }, NFC_CONSTANTS.REGISTER_TIMEOUT)

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

          // シリアル番号の正規化（小文字に統一、前後の空白を削除）
          const normalizedSerial = serialNumber.trim().toLowerCase()

          setNfcStatus("writing")
          setRegisteredToken(normalizedSerial)

          // シリアル番号を生徒に紐付ける
          const updateRes = await fetch(`/api/students/${registeringCardStudent.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cardId: normalizedSerial }),
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
        console.log("Event keys:", Object.keys(event))
        
        // serialNumberを取得（複数の方法を試す）
        // Androidの実装によっては、serialNumberが別のプロパティ名で提供される場合がある
        const serialNumber = event.serialNumber || 
                            event.message?.serialNumber || 
                            event.uid ||
                            event.id ||
                            event.cardId ||
                            null
        
        if (serialNumber) {
          console.log("Serial number from error event:", serialNumber)
          await processCard(serialNumber)
        } else {
          console.error("No serial number in error event")
          console.error("Available properties:", Object.keys(event))
          console.error("Full event object:", JSON.stringify(event, null, 2))
          setNfcStatus("error")
          setNfcError("このカード（Suica等のFeliCaカード）は、Web NFC APIではシリアル番号を取得できません。\n\n" +
            "【解決方法】\n" +
            "1. NFC Toolsアプリでカードのシリアル番号を取得\n" +
            "2. 「手動で入力」ボタンをクリック\n" +
            "3. 取得したシリアル番号を入力して登録\n\n" +
            "※ 本番環境では、NTAG213等のNDEF対応カードの使用を推奨します。")
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
      ...sortedStudents.map((student) =>
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

  const statusOptions: Array<{ value: StudentStatus; label: string }> = [
    { value: "active", label: "在籍" },
    { value: "suspended", label: "休会" },
    { value: "withdrawn", label: "退会" },
    { value: "graduated", label: "卒業" },
    { value: "disabled", label: "利用停止" },
  ]
  const roleOptions: Array<{ value: UserRole; label: string }> = [
    { value: "student", label: "生徒" },
    { value: "part_time", label: "アルバイト" },
    { value: "full_time", label: "正社員" },
  ]
  const cardOptions: Array<{ value: CardFilter; label: string }> = [
    { value: "registered", label: "登録済み" },
    { value: "unregistered", label: "未登録" },
  ]
  const eventOptions: Array<{ value: EventType; label: string }> = [
    { value: "entry", label: "入室" },
    { value: "exit", label: "退室" },
    { value: "no_log", label: "ログ無し" },
  ]

  const updateMultiSelect = <T,>(
    value: T,
    checked: boolean,
    setValues: (updater: (prev: T[]) => T[]) => void,
  ) => {
    setValues((prev) => {
      if (checked) {
        return prev.includes(value) ? prev : [...prev, value]
      }
      return prev.filter((item) => item !== value)
    })
  }

  const isAllStatusSelected = statusFilters.length === 0 || statusFilters.length === statusOptions.length
  const isAllRoleSelected = roleFilters.length === 0 || roleFilters.length === roleOptions.length
  const isAllCardSelected = cardFilters.length === 0 || cardFilters.length === cardOptions.length
  const isAllEventSelected = eventFilters.length === 0 || eventFilters.length === eventOptions.length

  const activeFilters = [
    ...(!isAllStatusSelected
      ? statusFilters.map((value) => ({
          key: `status-${value}`,
          label: `ステータス: ${getStatusLabel(value)}`,
          onRemove: () => setStatusFilters((prev) => prev.filter((item) => item !== value)),
        }))
      : []),
    ...(!isAllRoleSelected
      ? roleFilters.map((value) => ({
          key: `role-${value}`,
          label: `属性: ${getRoleLabel(value)}`,
          onRemove: () => setRoleFilters((prev) => prev.filter((item) => item !== value)),
        }))
      : []),
    ...(!isAllCardSelected
      ? cardFilters.map((value) => ({
          key: `card-${value}`,
          label: `カード登録: ${value === "registered" ? "登録済み" : "未登録"}`,
          onRemove: () => setCardFilters((prev) => prev.filter((item) => item !== value)),
        }))
      : []),
    ...(!isAllEventSelected
      ? eventFilters.map((value) => ({
          key: `event-${value}`,
          label: `最終イベント: ${getEventLabel(value)}`,
          onRemove: () => setEventFilters((prev) => prev.filter((item) => item !== value)),
        }))
      : []),
  ]
  const hasFilters = searchQuery.trim().length > 0 || activeFilters.length > 0
  const filterSummary =
    activeFilters.length > 0
      ? `適用中フィルター: ${activeFilters.length}`
      : searchQuery.trim().length > 0
      ? "検索中"
      : "フィルターなし"

  const handleResetFilters = () => {
    setSearchQuery("")
    setStatusFilters([...DEFAULT_STATUS_FILTERS])
    setRoleFilters([...DEFAULT_ROLE_FILTERS])
    setCardFilters([...DEFAULT_CARD_FILTERS])
    setEventFilters([...DEFAULT_EVENT_FILTERS])
  }

  return (
    <AdminLayout
      pageTitle="ユーザー一覧"
      actions={
        <>
          <Button variant="secondary" size="sm" className="gap-2" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">CSV出力</span>
          </Button>
          <Button variant="secondary" size="sm" className="gap-2" onClick={() => setIsBulkImportDialogOpen(true)}>
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
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ユーザー名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs text-muted-foreground">
                  {filterSummary}
                </div>
                <Button variant="outline" size="sm" onClick={handleResetFilters} disabled={!hasFilters}>
                  リセット
                </Button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              <div className="rounded-md border border-border bg-card/50 p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">ステータス</p>
                <div className="space-y-2">
                  {statusOptions.map((option) => {
                    const id = `filter-status-${option.value}`
                    return (
                      <label key={option.value} htmlFor={id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          id={id}
                          checked={statusFilters.includes(option.value)}
                          onCheckedChange={(checked) =>
                            updateMultiSelect(option.value, checked === true, setStatusFilters)
                          }
                        />
                        <span>{option.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-md border border-border bg-card/50 p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">属性</p>
                <div className="space-y-2">
                  {roleOptions.map((option) => {
                    const id = `filter-role-${option.value}`
                    return (
                      <label key={option.value} htmlFor={id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          id={id}
                          checked={roleFilters.includes(option.value)}
                          onCheckedChange={(checked) =>
                            updateMultiSelect(option.value, checked === true, setRoleFilters)
                          }
                        />
                        <span>{option.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-md border border-border bg-card/50 p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">カード登録</p>
                <div className="space-y-2">
                  {cardOptions.map((option) => {
                    const id = `filter-card-${option.value}`
                    return (
                      <label key={option.value} htmlFor={id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          id={id}
                          checked={cardFilters.includes(option.value)}
                          onCheckedChange={(checked) =>
                            updateMultiSelect(option.value, checked === true, setCardFilters)
                          }
                        />
                        <span>{option.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-md border border-border bg-card/50 p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">最終イベント</p>
                <div className="space-y-2">
                  {eventOptions.map((option) => {
                    const id = `filter-event-${option.value}`
                    return (
                      <label key={option.value} htmlFor={id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          id={id}
                          checked={eventFilters.includes(option.value)}
                          onCheckedChange={(checked) =>
                            updateMultiSelect(option.value, checked === true, setEventFilters)
                          }
                        />
                        <span>{option.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>

            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">適用中:</span>
                {activeFilters.map((filter) => (
                  <Badge key={filter.key} variant="outline" className="gap-1">
                    {filter.label}
                    <button
                      type="button"
                      onClick={filter.onRemove}
                      className="ml-1 text-muted-foreground hover:text-foreground"
                      aria-label={`${filter.label} を解除`}
                    >
                      x
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loading and Error Messages */}
        {isLoading && <div className="text-sm text-muted-foreground">読み込み中…</div>}
        {error && <div className="text-sm text-destructive">エラー: {error}</div>}

        {/* Students Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                読み込み中…
              </div>
            ) : filteredStudents.length === 0 ? (
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
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                      <TableHead aria-sort={getAriaSort("name")}>
                        <button
                          type="button"
                          onClick={() => handleSort("name")}
                          className={getSortButtonClass("left", "name")}
                        >
                          ユーザー名
                          {renderSortIcon("name")}
                        </button>
                      </TableHead>
                      <TableHead aria-sort={getAriaSort("role")}>
                        <button
                          type="button"
                          onClick={() => handleSort("role")}
                          className={getSortButtonClass("left", "role")}
                        >
                          属性
                          {renderSortIcon("role")}
                        </button>
                      </TableHead>
                      <TableHead aria-sort={getAriaSort("grade")}>
                        <button
                          type="button"
                          onClick={() => handleSort("grade")}
                          className={getSortButtonClass("left", "grade")}
                        >
                          学年
                          {renderSortIcon("grade")}
                        </button>
                      </TableHead>
                      <TableHead aria-sort={getAriaSort("status")}>
                        <button
                          type="button"
                          onClick={() => handleSort("status")}
                          className={getSortButtonClass("left", "status")}
                        >
                          ステータス
                          {renderSortIcon("status")}
                        </button>
                      </TableHead>
                      <TableHead aria-sort={getAriaSort("class")}>
                        <button
                          type="button"
                          onClick={() => handleSort("class")}
                          className={getSortButtonClass("left", "class")}
                        >
                          クラス
                          {renderSortIcon("class")}
                        </button>
                      </TableHead>
                      <TableHead aria-sort={getAriaSort("cardRegistered")}>
                        <button
                          type="button"
                          onClick={() => handleSort("cardRegistered")}
                          className={getSortButtonClass("left", "cardRegistered")}
                        >
                          カード登録
                          {renderSortIcon("cardRegistered")}
                        </button>
                      </TableHead>
                      <TableHead aria-sort={getAriaSort("cardId")}>
                        <button
                          type="button"
                          onClick={() => handleSort("cardId")}
                          className={getSortButtonClass("left", "cardId")}
                        >
                          カードID
                          {renderSortIcon("cardId")}
                        </button>
                      </TableHead>
                      <TableHead aria-sort={getAriaSort("lastEvent")}>
                        <button
                          type="button"
                          onClick={() => handleSort("lastEvent")}
                          className={getSortButtonClass("left", "lastEvent")}
                        >
                          最終イベント
                          {renderSortIcon("lastEvent")}
                        </button>
                      </TableHead>
                      <TableHead aria-sort={getAriaSort("lastEventTime")}>
                        <button
                          type="button"
                          onClick={() => handleSort("lastEventTime")}
                          className={getSortButtonClass("left", "lastEventTime")}
                        >
                          最終イベント日時
                          {renderSortIcon("lastEventTime")}
                        </button>
                      </TableHead>
                      <TableHead className="text-center" aria-sort={getAriaSort("notificationCount")}>
                        <button
                          type="button"
                          onClick={() => handleSort("notificationCount")}
                          className={getSortButtonClass("center", "notificationCount")}
                        >
                          通知先人数
                          {renderSortIcon("notificationCount")}
                        </button>
                      </TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStudents.map((student) => (
                      <TableRow
                        key={student.id}
                        className="cursor-pointer"
                        onClick={() => handleRowClick(student.id)}
                      >
                        <TableCell className="link-accent">{student.name}</TableCell>
                        <TableCell>
                          <Badge variant="neutral">{getRoleLabel(student.role)}</Badge>
                        </TableCell>
                        <TableCell>{student.grade || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(student.status)}>{getStatusLabel(student.status)}</Badge>
                        </TableCell>
                        <TableCell>{getClassLabel(student.class)}</TableCell>
                        <TableCell>
                          {student.card_registered ? (
                            <Badge variant="status">登録済み</Badge>
                          ) : (
                            <Badge variant="neutral">未登録</Badge>
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
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="secondary"
                                      size="icon-sm"
                                      aria-label="カード変更"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleRegisterCard(student)
                                      }}
                                    >
                                      <CreditCard className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">カード変更</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="destructive"
                                      size="icon-sm"
                                      aria-label="カード削除"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteCard(student)
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">カード削除</TooltipContent>
                                </Tooltip>
                              </>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="secondary"
                                    size="icon-sm"
                                    aria-label="カード登録"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleRegisterCard(student)
                                    }}
                                  >
                                    <CreditCard className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">カード登録</TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="secondary"
                                  size="icon-sm"
                                  aria-label="編集"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditStudent(student)
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">編集</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="secondary"
                                  size="icon-sm"
                                  aria-label="詳細"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRowClick(student.id)
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">詳細</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  {startIndex}-{endIndex} / {totalStudents}件
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
            </>
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
                  <SelectItem value="disabled">利用停止</SelectItem>
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
                  onValueChange={handleEditRoleChange}
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
                    <SelectItem value="disabled">利用停止</SelectItem>
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
                <div className="rounded-md border border-yellow-500/40 bg-secondary p-4 text-sm">
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
              <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-secondary p-6">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="text-sm font-semibold text-primary">カードを端末にタッチしてください</p>
                <p className="text-xs text-muted-foreground">シリアル番号を読み取り中...</p>
              </div>
            )}

            {nfcStatus === "writing" && (
              <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-secondary p-6">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="text-sm font-semibold text-primary">登録中...</p>
                <p className="text-xs text-muted-foreground">サーバーに保存しています...</p>
              </div>
            )}

            {nfcStatus === "success" && (
              <div className="space-y-3">
                <div className="rounded-md border border-border bg-secondary p-4">
                  <p className="text-sm font-semibold text-primary mb-2">✓ 登録完了</p>
                  <p className="text-xs text-muted-foreground">
                    カードのシリアル番号を登録しました。
                  </p>
                  {registeredToken && (
                    <p className="text-xs text-muted-foreground mt-2 font-mono break-all">
                      カードID: {registeredToken}
                    </p>
                  )}
                </div>
              </div>
            )}

            {nfcStatus === "error" && (
              <div className="space-y-3">
                <div className="rounded-md border border-destructive/40 bg-secondary p-4">
                  <p className="text-sm font-semibold text-destructive mb-2">✗ エラー</p>
                  <p className="text-xs text-destructive">{nfcError}</p>
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
              <div className="rounded-md border border-destructive/40 bg-secondary p-4">
                <p className="text-sm font-semibold text-destructive mb-2">エラー</p>
                <p className="text-xs text-destructive">{uploadError}</p>
              </div>
            )}
            {uploadSuccess && uploadResult && (
              <div className="rounded-md border border-border bg-secondary p-4">
                <p className="text-sm font-semibold text-primary mb-2">登録完了</p>
                <p className="text-xs text-muted-foreground">
                  成功: {uploadResult.success}件、失敗: {uploadResult.failed}件
                </p>
                {uploadResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-foreground">エラー詳細：</p>
                    <ul className="text-xs text-muted-foreground list-disc list-inside mt-1">
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
