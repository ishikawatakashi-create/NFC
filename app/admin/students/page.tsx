"use client"

import { useState } from "react"
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
import { Plus, Download, Search, Eye, UserPlus } from "lucide-react"

type StudentStatus = "active" | "suspended" | "withdrawn"
type EventType = "entry" | "exit" | "forced_exit"

interface Student {
  id: string
  name: string
  grade?: string
  status: StudentStatus
  lastEvent?: EventType
  lastEventTime?: string
  notificationCount: number
}

const mockStudents: Student[] = [
  {
    id: "1",
    name: "田中太郎",
    grade: "小学3年",
    status: "active",
    lastEvent: "entry",
    lastEventTime: "2024-01-15 15:30",
    notificationCount: 2,
  },
  {
    id: "2",
    name: "佐藤花子",
    grade: "小学5年",
    status: "active",
    lastEvent: "exit",
    lastEventTime: "2024-01-15 17:00",
    notificationCount: 1,
  },
  {
    id: "3",
    name: "鈴木一郎",
    grade: "小学4年",
    status: "suspended",
    lastEvent: "exit",
    lastEventTime: "2024-01-10 16:45",
    notificationCount: 2,
  },
]

export default function StudentsPage() {
  const router = useRouter()
  const [students] = useState<Student[]>(mockStudents)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newStudent, setNewStudent] = useState({
    name: "",
    grade: "",
    status: "active" as StudentStatus,
  })

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

  const handleAddStudent = () => {
    console.log("Adding student:", newStudent)
    setIsAddDialogOpen(false)
    setNewStudent({ name: "", grade: "", status: "active" })
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
                        <TableCell>{getEventLabel(student.lastEvent)}</TableCell>
                        <TableCell className="text-muted-foreground">{student.lastEventTime || "-"}</TableCell>
                        <TableCell className="text-center">{student.notificationCount}</TableCell>
                        <TableCell className="text-right">
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
    </AdminLayout>
  )
}
