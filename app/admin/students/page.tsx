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
import { Plus, Download, Search, Eye, UserPlus, Pencil, Trash2 } from "lucide-react"

type StudentStatus = "active" | "suspended" | "withdrawn"
type StudentClass = "kindergarten" | "beginner" | "challenger" | "creator" | "innovator"
type EventType = "entry" | "exit" | "forced_exit"

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
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [newStudent, setNewStudent] = useState({
    name: "",
    grade: "",
    status: "active" as StudentStatus,
    class: undefined as StudentClass | undefined,
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
        status?: "active" | "suspended" | "withdrawn"
        class?: string | null
        created_at?: string | null
      }> = data.students ?? []

      // ★UIの Student 型に"寄せる"。未実装列は埋める。
      const mapped: Student[] = apiStudents.map((s) => ({
        id: String(s.id), // 確実に文字列化
        name: s.name ?? "",
        grade: s.grade ? String(s.grade) : undefined,
        status: (s.status ?? "active") as StudentStatus,
        class: s.class ? (s.class as StudentClass) : undefined, // DBから取得したclassを反映
        lastEvent: undefined, // DB未実装なら undefined
        lastEventTime: undefined, // DB未実装なら undefined
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

  const getEventLabel = (event?: EventType) => {
    if (!event) return "-"
    switch (event) {
      case "entry":
        return "入室"
      case "exit":
        return "退室"
      case "forced_exit":
        return "強制退室"
    }
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
      setNewStudent({ name: "", grade: "", status: "active", class: undefined })

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

  const handleUpdateStudent = () => {
    if (!editingStudent) return

    setStudents(
      students.map((s) =>
        s.id === editingStudent.id
          ? {
              ...s,
              name: editingStudent.name,
              grade: editingStudent.grade,
              class: editingStudent.class,
              notificationRecipients: editingStudent.notificationRecipients?.filter((r) => r.name.trim() !== "") || [],
              notificationCount: editingStudent.notificationRecipients?.filter((r) => r.name.trim() !== "").length || 0,
            }
          : s
      )
    )
    setIsEditDialogOpen(false)
    setEditingStudent(null)
  }

  const handleCancelEdit = () => {
    setIsEditDialogOpen(false)
    setEditingStudent(null)
  }

  return (
    <AdminLayout
      pageTitle="生徒一覧"
      breadcrumbs={[{ label: "生徒一覧" }]}
      actions={
        <>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">CSV出力</span>
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">生徒追加</span>
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
                  placeholder="生徒名で検索..."
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
                <h3 className="mb-2 text-lg font-semibold">生徒がいません</h3>
                <p className="mb-4 text-sm text-muted-foreground">生徒を追加して管理を始めましょう</p>
                <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  生徒を追加
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>生徒名</TableHead>
                      <TableHead>学年</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>クラス</TableHead>
                      <TableHead>最終イベント</TableHead>
                      <TableHead>最終イベント時刻</TableHead>
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
                        <TableCell>{student.grade || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(student.status)}>{getStatusLabel(student.status)}</Badge>
                        </TableCell>
                        <TableCell>{getClassLabel(student.class)}</TableCell>
                        <TableCell>{getEventLabel(student.lastEvent)}</TableCell>
                        <TableCell className="text-muted-foreground">{student.lastEventTime || "-"}</TableCell>
                        <TableCell className="text-center">{student.notificationCount}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
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
            <DialogTitle>生徒を追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">生徒名 *</Label>
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
            <DialogTitle>生徒を編集</DialogTitle>
          </DialogHeader>
          {editingStudent && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">生徒名 *</Label>
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
    </AdminLayout>
  )
}
