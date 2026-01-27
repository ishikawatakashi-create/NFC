"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Student {
  id: string
  name: string
  grade?: string
  current_points?: number
  class?: string
}

export default function StudentsPointsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadStudents() {
      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch("/api/students", { cache: "no-store" })
        const data = await res.json()

        if (!res.ok || !data?.ok) {
          const errorMessage = typeof data?.error === "string"
            ? data.error
            : data?.error?.message || String(data?.error) || "データの読み込みに失敗しました"
          throw new Error(errorMessage)
        }

        // 生徒のみをフィルタ（role = 'student'）
        const studentList: Student[] = (data.students || [])
          .filter((s: any) => s.role === "student" && s.status === "active")
          .map((s: any) => ({
            id: String(s.id),
            name: s.name,
            grade: s.grade || undefined,
            current_points: s.current_points || 0,
            class: s.class || undefined,
          }))
          .sort((a: Student, b: Student) => a.name.localeCompare(b.name, "ja"))

        setStudents(studentList)
      } catch (e: any) {
        const errorMessage = e?.message || String(e) || "エラーが発生しました"
        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    loadStudents()
  }, [])

  function getClassLabel(studentClass?: string) {
    if (!studentClass) return ""
    const classLabels: Record<string, string> = {
      kindergarten: "キンダー",
      beginner: "ビギナー",
      challenger: "チャレンジャー",
      creator: "クリエイター",
      innovator: "イノベーター",
    }
    return classLabels[studentClass] || studentClass
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted">
        <div className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
              ロボ団一宮校 入退室管理
            </div>
            <span className="text-xs text-sidebar-foreground/70">Students</span>
          </div>
          <div className="h-0.5 bg-primary" />
        </div>
        <div className="flex items-center justify-center p-6">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted">
        <div className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
              ロボ団一宮校 入退室管理
            </div>
            <span className="text-xs text-sidebar-foreground/70">Students</span>
          </div>
          <div className="h-0.5 bg-primary" />
        </div>
        <div className="flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-md border border-border bg-card p-4">
            <p className="text-sm text-destructive text-center">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted">
      <div className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
            ロボ団一宮校 入退室管理
          </div>
          <span className="text-xs text-sidebar-foreground/70">Students</span>
        </div>
        <div className="h-0.5 bg-primary" />
      </div>
      <div className="max-w-4xl mx-auto space-y-6 py-6 px-4">
        <div>
          <h1>ポイント一覧</h1>
          <p className="text-sm text-muted-foreground">みんなのポイントを見てみよう！</p>
        </div>

        {students.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground text-center">まだポイントがありません</p>
          </div>
        ) : (
          <div className="rounded-md border border-border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead>学年 / クラス</TableHead>
                  <TableHead className="text-right">ポイント</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="link-accent">{student.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {student.grade && <span>{student.grade}</span>}
                        {student.class && <span>{getClassLabel(student.class)}</span>}
                        {!student.grade && !student.class && <span>-</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {student.current_points || 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="text-center text-xs text-muted-foreground">
          <p>ポイントは入室すると増えます！</p>
        </div>
      </div>
    </div>
  )
}
