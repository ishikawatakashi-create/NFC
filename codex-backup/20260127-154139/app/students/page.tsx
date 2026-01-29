"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Coins, Loader2 } from "lucide-react"

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-700">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <p className="text-red-600 text-center">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
            <Coins className="w-10 h-10 text-yellow-500" />
            ポイント一覧
          </h1>
          <p className="text-gray-600 text-lg">みんなのポイントを見てみよう！</p>
        </div>

        {/* 一覧表示 */}
        {students.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-600">まだポイントがありません</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((student) => (
              <Card
                key={student.id}
                className="transition-all hover:shadow-lg hover:scale-105"
              >
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {/* 名前と学年・クラス */}
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{student.name}</h3>
                      <div className="flex flex-wrap gap-2">
                        {student.grade && (
                          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {student.grade}
                          </span>
                        )}
                        {student.class && (
                          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {getClassLabel(student.class)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ポイント表示 */}
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex items-center justify-center gap-2">
                        <Coins className="w-8 h-8 text-yellow-500" />
                        <div className="text-center">
                          <div className="text-4xl font-bold text-gray-800">
                            {student.current_points || 0}
                          </div>
                          <div className="text-sm text-gray-600">ポイント</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* フッター */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>ポイントは入室すると増えます！</p>
        </div>
      </div>
    </div>
  )
}

