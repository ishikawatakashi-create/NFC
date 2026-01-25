"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

interface Student {
  id: string
  name: string
  role?: "student" | "part_time" | "full_time"
  access_start_time?: string | null
  access_end_time?: string | null
  has_custom_access_time?: boolean
}

interface IndividualAccessTimeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function IndividualAccessTimeDialog({
  open,
  onOpenChange,
}: IndividualAccessTimeDialogProps) {
  const { toast } = useToast()
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [editStartTime, setEditStartTime] = useState("09:00")
  const [editEndTime, setEditEndTime] = useState("20:00")
  const [roleAccessTimes, setRoleAccessTimes] = useState<Record<string, { start_time: string; end_time: string }>>({})

  // データを読み込む
  useEffect(() => {
    if (open) {
      loadStudents()
    }
  }, [open])

  // 編集ダイアログを開く
  useEffect(() => {
    if (editingStudent) {
      // 個別設定がある場合は個別設定の時間を表示、ない場合は属性に紐づいた時間を表示
      if (editingStudent.has_custom_access_time && editingStudent.access_start_time && editingStudent.access_end_time) {
        setEditStartTime(editingStudent.access_start_time.substring(0, 5))
        setEditEndTime(editingStudent.access_end_time.substring(0, 5))
      } else if (editingStudent.role && roleAccessTimes[editingStudent.role]) {
        setEditStartTime(roleAccessTimes[editingStudent.role].start_time.substring(0, 5))
        setEditEndTime(roleAccessTimes[editingStudent.role].end_time.substring(0, 5))
      } else {
        setEditStartTime("09:00")
        setEditEndTime("20:00")
      }
    }
  }, [editingStudent, roleAccessTimes])

  async function loadStudents() {
    setIsLoading(true)
    try {
      // 属性ごとの開放時間設定を取得
      const accessTimesRes = await fetch("/api/access-times", { cache: "no-store" })
      const accessTimesData = await accessTimesRes.json()

      if (accessTimesRes.ok && accessTimesData?.ok && accessTimesData?.accessTimes) {
        setRoleAccessTimes(accessTimesData.accessTimes)
      }

      // ユーザー一覧を取得
      const res = await fetch("/api/students", { cache: "no-store" })
      const data = await res.json()

      if (res.ok && data?.ok && data?.students) {
        setStudents(data.students)
      } else {
        throw new Error(data?.error || "データの取得に失敗しました")
      }
    } catch (e: any) {
      toast({
        title: "エラー",
        description: e?.message || "データの取得に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    if (!editingStudent) return

    try {
      const res = await fetch(`/api/students/${editingStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingStudent.name,
          grade: undefined,
          status: undefined,
          role: editingStudent.role,
          access_start_time: editStartTime,
          access_end_time: editEndTime,
          has_custom_access_time: true,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        const errorMessage = data?.error || "保存に失敗しました"
        throw new Error(errorMessage)
      }

      toast({
        title: "保存しました",
        description: `${editingStudent.name}さんの開放時間を保存しました。`,
      })

      // リストを更新
      await loadStudents()
      setEditingStudent(null)
    } catch (e: any) {
      toast({
        title: "エラー",
        description: e?.message || "保存に失敗しました",
        variant: "destructive",
      })
    }
  }

  async function handleClearCustomAccessTime() {
    if (!editingStudent) return

    const confirmClear = window.confirm(
      `${editingStudent.name}さんの個別設定を解除し、属性の開放時間に戻しますか？`
    )
    if (!confirmClear) return

    try {
      const res = await fetch(`/api/students/${editingStudent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editingStudent.role || "student",
          has_custom_access_time: false,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        const errorMessage = data?.error || "解除に失敗しました"
        throw new Error(errorMessage)
      }

      toast({
        title: "解除しました",
        description: `${editingStudent.name}さんの個別設定を解除しました。`,
      })

      await loadStudents()
      setEditingStudent(null)
    } catch (e: any) {
      toast({
        title: "エラー",
        description: e?.message || "解除に失敗しました",
        variant: "destructive",
      })
    }
  }

  function getRoleLabel(role?: string) {
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

  function formatTime(student: Student) {
    // 個別設定がある場合は個別設定の時間を表示
    if (student.has_custom_access_time && student.access_start_time && student.access_end_time) {
      return {
        start: student.access_start_time.substring(0, 5),
        end: student.access_end_time.substring(0, 5),
      }
    }

    // 個別設定がない場合は属性に紐づいた開放時間を表示
    if (student.role && roleAccessTimes[student.role]) {
      return {
        start: roleAccessTimes[student.role].start_time.substring(0, 5),
        end: roleAccessTimes[student.role].end_time.substring(0, 5),
      }
    }

    // デフォルト値
    return {
      start: "09:00",
      end: "20:00",
    }
  }

  return (
    <>
      <Dialog open={open && !editingStudent} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>個別開放時間設定</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">読み込み中...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead>属性</TableHead>
                    <TableHead>開始時刻</TableHead>
                    <TableHead>終了時刻</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        ユーザーが見つかりません
                      </TableCell>
                    </TableRow>
                  ) : (
                    students.map((student) => {
                      const time = formatTime(student)
                      return (
                        <TableRow key={student.id}>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{getRoleLabel(student.role)}</Badge>
                          </TableCell>
                          <TableCell>{time.start}</TableCell>
                          <TableCell>{time.end}</TableCell>
                          <TableCell>
                            {student.has_custom_access_time ? (
                              <Badge variant="default">個別設定</Badge>
                            ) : (
                              <Badge variant="secondary">属性設定</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingStudent(student)}
                            >
                              編集
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編集ダイアログ */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStudent?.name}さんの開放時間設定
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-start-time">開始時刻</Label>
                <Input
                  id="edit-start-time"
                  type="time"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end-time">終了時刻</Label>
                <Input
                  id="edit-end-time"
                  type="time"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              個別設定を保存すると、属性が変更されてもこの設定が優先されます。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStudent(null)}>
              キャンセル
            </Button>
            {editingStudent?.has_custom_access_time && (
              <Button variant="destructive" onClick={handleClearCustomAccessTime}>
                個別設定を解除
              </Button>
            )}
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
