"use client"

import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Pencil, Trash2, UserPlus, MessageSquare, Users, RefreshCw, Copy } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

interface Parent {
  id: string
  name: string
  phoneNumber?: string
  email?: string
  relationship?: "mother" | "father" | "guardian" | "other"
  notes?: string
  lineAccount?: {
    id: string
    lineUserId: string
    lineDisplayName?: string
    isActive: boolean
  } | null
  students?: Array<{
    id: string
    name: string
  }>
}

interface Student {
  id: string
  name: string
}

export default function ParentsPage() {
  const [parents, setParents] = useState<Parent[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isLineLinkDialogOpen, setIsLineLinkDialogOpen] = useState(false)
  const [isStudentLinkDialogOpen, setIsStudentLinkDialogOpen] = useState(false)
  const [editingParent, setEditingParent] = useState<Parent | null>(null)
  const [linkingParent, setLinkingParent] = useState<Parent | null>(null)
  const [newParent, setNewParent] = useState({
    name: "",
    phoneNumber: "",
    email: "",
    relationship: "mother" as "mother" | "father" | "guardian" | "other",
    notes: "",
    studentIds: [] as string[],
  })
  const [lineUserId, setLineUserId] = useState("")
  const [lineDisplayName, setLineDisplayName] = useState("")
  const [lineFollowers, setLineFollowers] = useState<Array<{ userId: string; displayName: string; pictureUrl: string | null }>>([])
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false)
  const [showFollowers, setShowFollowers] = useState(false)

  async function loadParents() {
    setIsLoading(true)
    setError(null)

    try {
      // キャッシュを確実に回避するためtimestampを追加
      const timestamp = new Date().getTime()
      const res = await fetch(`/api/parents?_t=${timestamp}`, { cache: "no-store" })
      const data = await res.json()

      if (!res.ok || !data?.ok) {
        const errorMessage = typeof data?.error === "string" 
          ? data.error 
          : data?.error?.message || String(data?.error) || "Failed to load parents"
        throw new Error(errorMessage)
      }

      const apiParents: Parent[] = (data.parents || []).map((p: any) => ({
        id: String(p.id),
        name: p.name || "",
        phoneNumber: p.phoneNumber || undefined,
        email: p.email || undefined,
        relationship: p.relationship || undefined,
        notes: p.notes || undefined,
        lineAccount: p.lineAccount || null,
        students: [], // 後で取得
      }))

      // 各親御さんに紐づいている生徒を取得
      for (const parent of apiParents) {
        try {
          const timestamp = new Date().getTime()
          const studentRes = await fetch(`/api/parents/${parent.id}/students?_t=${timestamp}`, { cache: "no-store" })
          const studentData = await studentRes.json()
          if (studentData?.ok && studentData?.students) {
            parent.students = studentData.students.map((s: any) => ({
              id: String(s.id),
              name: s.name || "",
            }))
            console.log(`[Parents] Loaded ${parent.students.length} students for parent ${parent.name} (${parent.id})`)
          } else {
            console.warn(`[Parents] No students found for parent ${parent.name} (${parent.id})`)
          }
        } catch (e) {
          console.error(`Failed to load students for parent ${parent.id}:`, e)
        }
      }

      setParents(apiParents)
    } catch (e: any) {
      const errorMessage = e?.message || String(e) || "Unknown error"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadStudents() {
    try {
      const res = await fetch("/api/students", { cache: "no-store" })
      const data = await res.json()

      if (res.ok && data?.ok && data?.students) {
        const apiStudents: Student[] = (data.students || []).map((s: any) => ({
          id: String(s.id),
          name: s.name || "",
        }))
        setStudents(apiStudents)
      }
    } catch (e) {
      console.error("Failed to load students:", e)
    }
  }

  async function loadLineFollowers() {
    setIsLoadingFollowers(true)
    try {
      const res = await fetch("/api/line/followers", { cache: "no-store" })
      const data = await res.json()

      if (!res.ok || !data?.ok) {
        const errorMessage = typeof data?.error === "string" 
          ? data.error 
          : data?.error?.message || String(data?.error) || "Failed to load LINE followers"
        throw new Error(errorMessage)
      }

      // APIから直接followers配列を取得（プロフィール情報は既に含まれている）
      const followers: Array<{ userId: string; displayName: string; pictureUrl: string | null }> = data.followers || []
      setLineFollowers(followers)
    } catch (e: any) {
      const errorMessage = e?.message || String(e) || "Unknown error"
      console.error("Failed to load LINE followers:", errorMessage)
      alert(`LINE友だち一覧の取得に失敗しました: ${errorMessage}`)
    } finally {
      setIsLoadingFollowers(false)
    }
  }

  useEffect(() => {
    loadParents()
    loadStudents()
  }, [])

  const filteredParents = parents.filter((parent) => {
    const matchesSearch = parent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      parent.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      parent.phoneNumber?.includes(searchQuery)
    return matchesSearch
  })

  const getRelationshipLabel = (relationship?: string) => {
    switch (relationship) {
      case "mother":
        return "母親"
      case "father":
        return "父親"
      case "guardian":
        return "保護者"
      case "other":
        return "その他"
      default:
        return "-"
    }
  }

  const handleAddParent = async () => {
    if (!newParent.name.trim()) return

    try {
      const res = await fetch("/api/parents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newParent.name.trim(),
          phoneNumber: newParent.phoneNumber.trim() || null,
          email: newParent.email.trim() || null,
          relationship: newParent.relationship,
          notes: newParent.notes.trim() || null,
          studentIds: newParent.studentIds,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        const errorMessage = typeof data?.error === "string" 
          ? data.error 
          : data?.error?.message || String(data?.error) || "Failed to create parent"
        throw new Error(errorMessage)
      }

      const createdParentId = data.parent?.id

      setIsAddDialogOpen(false)
      
      // LINE User IDが設定されている場合、自動的に紐付け
      if (lineUserId && createdParentId) {
        try {
          const linkRes = await fetch(`/api/parents/${createdParentId}/line-account`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lineUserId: lineUserId.trim(),
              lineDisplayName: lineDisplayName.trim() || newParent.name.trim(),
            }),
          })
          const linkData = await linkRes.json()
          if (linkRes.ok && linkData?.ok) {
            // 紐付け成功
          }
        } catch (e) {
          console.error("Failed to auto-link LINE account:", e)
        }
      }

      setNewParent({
        name: "",
        phoneNumber: "",
        email: "",
        relationship: "mother",
        notes: "",
        studentIds: [],
      })
      setLineUserId("")
      setLineDisplayName("")
      await loadParents()
    } catch (e: any) {
      const errorMessage = e?.message || String(e) || "Failed to create parent"
      alert(`エラー: ${errorMessage}`)
    }
  }

  const handleEditParent = (parent: Parent) => {
    setEditingParent(parent)
    setNewParent({
      name: parent.name,
      phoneNumber: parent.phoneNumber || "",
      email: parent.email || "",
      relationship: parent.relationship || "mother",
      notes: parent.notes || "",
      studentIds: parent.students?.map(s => s.id) || [],
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateParent = async () => {
    if (!editingParent || !newParent.name.trim()) return

    try {
      const res = await fetch(`/api/parents/${editingParent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newParent.name.trim(),
          phoneNumber: newParent.phoneNumber.trim() || null,
          email: newParent.email.trim() || null,
          relationship: newParent.relationship,
          notes: newParent.notes.trim() || null,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        const errorMessage = typeof data?.error === "string" 
          ? data.error 
          : data?.error?.message || String(data?.error) || "Failed to update parent"
        throw new Error(errorMessage)
      }

      setIsEditDialogOpen(false)
      setEditingParent(null)
      await loadParents()
    } catch (e: any) {
      const errorMessage = e?.message || String(e) || "Failed to update parent"
      alert(`エラー: ${errorMessage}`)
    }
  }

  const handleDeleteParent = async () => {
    if (!editingParent) return

    try {
      const res = await fetch(`/api/parents/${editingParent.id}`, {
        method: "DELETE",
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        const errorMessage = typeof data?.error === "string" 
          ? data.error 
          : data?.error?.message || String(data?.error) || "Failed to delete parent"
        throw new Error(errorMessage)
      }

      setIsDeleteDialogOpen(false)
      setEditingParent(null)
      await loadParents()
    } catch (e: any) {
      const errorMessage = e?.message || String(e) || "Failed to delete parent"
      alert(`エラー: ${errorMessage}`)
    }
  }

  const handleLinkLineAccount = async () => {
    if (!linkingParent || !lineUserId.trim()) {
      alert("LINE User IDを入力してください")
      return
    }

    try {
      const res = await fetch(`/api/parents/${linkingParent.id}/line-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineUserId: lineUserId.trim(),
          lineDisplayName: lineDisplayName.trim() || linkingParent.name,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        const errorMessage = typeof data?.error === "string" 
          ? data.error 
          : data?.error?.message || String(data?.error) || "Failed to link LINE account"
        throw new Error(errorMessage)
      }

      setIsLineLinkDialogOpen(false)
      setLinkingParent(null)
      setLineUserId("")
      setLineDisplayName("")
      await loadParents()
      alert("LINEアカウントを紐付けました")
    } catch (e: any) {
      const errorMessage = e?.message || String(e) || "Failed to link LINE account"
      alert(`エラー: ${errorMessage}`)
    }
  }

  const handleLinkStudent = async () => {
    if (!linkingParent || newParent.studentIds.length === 0) {
      alert("紐付ける生徒を選択してください")
      return
    }

    try {
      // 既存の紐付けを取得
      const existingRes = await fetch(`/api/parents/${linkingParent.id}/students`)
      const existingData = await existingRes.json()
      const existingStudentIds = existingData?.ok && existingData?.students 
        ? existingData.students.map((s: any) => String(s.id))
        : []

      // 新しく追加する生徒のみを追加
      const newStudentIds = newParent.studentIds.filter(id => !existingStudentIds.includes(id))

      let successCount = 0
      let failedCount = 0

      for (const studentId of newStudentIds) {
        const res = await fetch(`/api/parents/${linkingParent.id}/students`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            isPrimary: false,
          }),
        })

        const data = await res.json()
        if (!res.ok || !data?.ok) {
          console.error(`Failed to link student ${studentId}:`, data)
          failedCount++
        } else {
          console.log(`[Parents] Successfully linked student ${studentId} to parent ${linkingParent.id}`)
          successCount++
        }
      }

      setIsStudentLinkDialogOpen(false)
      setLinkingParent(null)
      setNewParent(prev => ({ ...prev, studentIds: [] }))
      await loadParents()
      
      if (failedCount > 0) {
        alert(`生徒を紐付けました（成功: ${successCount}件、失敗: ${failedCount}件）`)
      } else {
        alert(`生徒を${successCount}件紐付けました`)
      }
    } catch (e: any) {
      const errorMessage = e?.message || String(e) || "Failed to link students"
      alert(`エラー: ${errorMessage}`)
    }
  }

  const handleOpenLineLinkDialog = (parent: Parent) => {
    setLinkingParent(parent)
    setLineUserId(parent.lineAccount?.lineUserId || "")
    setLineDisplayName(parent.lineAccount?.lineDisplayName || parent.name)
    setIsLineLinkDialogOpen(true)
  }

  const handleCopyLineUserId = async (userId: string) => {
    try {
      await navigator.clipboard.writeText(userId)
      alert("LINE User IDをコピーしました")
    } catch (e) {
      console.error("Failed to copy LINE User ID:", e)
      alert("コピーに失敗しました")
    }
  }

  const handleSelectLineFollower = (follower: { userId: string; displayName: string }) => {
    // 既に紐付けられている親御さんを探す
    const existingParent = parents.find(
      (p) => p.lineAccount?.lineUserId === follower.userId && p.lineAccount?.isActive
    )

    if (existingParent) {
      alert(`${existingParent.name} に既に紐付けられています`)
      return
    }

    // 親御さんを選択するダイアログを表示するか、新規作成を促す
    const shouldCreateNew = confirm(
      `${follower.displayName} を紐付ける親御さんを選択してください。\n\n新規作成する場合は「OK」、既存の親御さんを選択する場合は「キャンセル」をクリックしてください。`
    )

    if (shouldCreateNew) {
      // 新規作成
      setNewParent({
        name: follower.displayName,
        phoneNumber: "",
        email: "",
        relationship: "mother",
        notes: "",
        studentIds: [],
      })
      setLineUserId(follower.userId)
      setLineDisplayName(follower.displayName)
      setIsAddDialogOpen(true)
    } else {
      // 既存の親御さんを選択
      const parentName = prompt("紐付ける親御さんの名前を入力してください（検索用）:")
      if (parentName) {
        const foundParent = parents.find((p) => p.name.includes(parentName))
        if (foundParent) {
          setLinkingParent(foundParent)
          setLineUserId(follower.userId)
          setLineDisplayName(follower.displayName)
          setIsLineLinkDialogOpen(true)
        } else {
          alert("親御さんが見つかりませんでした")
        }
      }
    }
  }

  const handleOpenStudentLinkDialog = (parent: Parent) => {
    setLinkingParent(parent)
    setNewParent(prev => ({
      ...prev,
      studentIds: parent.students?.map(s => s.id) || [],
    }))
    setIsStudentLinkDialogOpen(true)
  }

  return (
    <AdminLayout pageTitle="親御さん管理">
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">親御さん管理</h1>
            <p className="text-muted-foreground mt-1">
              LINE通知を受信する親御さんの管理
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            親御さんを追加
          </Button>
        </div>

        {/* エラー表示 */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* 検索とLINE友だち一覧 */}
        <div className="flex gap-4">
          <Card className="flex-1">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="名前、メールアドレス、電話番号で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Button
                variant={showFollowers ? "default" : "outline"}
                onClick={() => {
                  setShowFollowers(!showFollowers)
                  if (!showFollowers && lineFollowers.length === 0) {
                    loadLineFollowers()
                  }
                }}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                LINE友だち一覧
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* LINE友だち一覧 */}
        {showFollowers && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>LINE公式アカウントの友だち一覧 ({lineFollowers.length}人)</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadLineFollowers}
                  disabled={isLoadingFollowers}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingFollowers ? "animate-spin" : ""}`} />
                  更新
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingFollowers ? (
                <p className="text-center py-8 text-muted-foreground">読み込み中...</p>
              ) : lineFollowers.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">友だちが登録されていません</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {lineFollowers.map((follower) => {
                    const isLinked = parents.some(
                      (p) => p.lineAccount?.lineUserId === follower.userId && p.lineAccount?.isActive
                    )
                    return (
                      <div
                        key={follower.userId}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {follower.pictureUrl && (
                            <img
                              src={follower.pictureUrl}
                              alt={follower.displayName}
                              className="w-10 h-10 rounded-full"
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-medium">{follower.displayName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{follower.userId}</p>
                          </div>
                          {isLinked && (
                            <Badge variant="default" className="gap-1">
                              <MessageSquare className="h-3 w-3" />
                              紐付け済み
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyLineUserId(follower.userId)}
                            title="LINE User IDをコピー"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectLineFollower(follower)}
                            disabled={isLinked}
                          >
                            {isLinked ? "紐付け済み" : "紐付け"}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 一覧 */}
        <Card>
          <CardHeader>
            <CardTitle>親御さん一覧 ({filteredParents.length}件)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">読み込み中...</p>
            ) : filteredParents.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">親御さんが登録されていません</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead>続柄</TableHead>
                    <TableHead>メール</TableHead>
                    <TableHead>電話番号</TableHead>
                    <TableHead>紐づけ生徒</TableHead>
                    <TableHead>LINE連携</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParents.map((parent) => (
                    <TableRow key={parent.id}>
                      <TableCell className="font-medium">{parent.name}</TableCell>
                      <TableCell>{getRelationshipLabel(parent.relationship)}</TableCell>
                      <TableCell>{parent.email || "-"}</TableCell>
                      <TableCell>{parent.phoneNumber || "-"}</TableCell>
                      <TableCell>
                        {parent.students && parent.students.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {parent.students.map((student) => (
                              <Badge key={student.id} variant="outline">
                                {student.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {parent.lineAccount?.isActive ? (
                          <Badge variant="default" className="gap-1">
                            <MessageSquare className="h-3 w-3" />
                            連携済み
                          </Badge>
                        ) : (
                          <Badge variant="secondary">未連携</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenStudentLinkDialog(parent)}
                            title="生徒を紐付け"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenLineLinkDialog(parent)}
                            title="LINEアカウントを紐付け"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditParent(parent)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingParent(parent)
                              setIsDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 親御さん追加ダイアログ */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>親御さんを追加</DialogTitle>
            <DialogDescription>
              新しい親御さんを登録します。LINE通知を受信するには、後でLINEアカウントを紐付ける必要があります。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">名前 *</Label>
              <Input
                id="name"
                value={newParent.name}
                onChange={(e) => setNewParent({ ...newParent, name: e.target.value })}
                placeholder="山田花子"
              />
            </div>
            <div>
              <Label htmlFor="relationship">続柄</Label>
              <Select
                value={newParent.relationship}
                onValueChange={(value: "mother" | "father" | "guardian" | "other") =>
                  setNewParent({ ...newParent, relationship: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mother">母親</SelectItem>
                  <SelectItem value="father">父親</SelectItem>
                  <SelectItem value="guardian">保護者</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={newParent.email}
                onChange={(e) => setNewParent({ ...newParent, email: e.target.value })}
                placeholder="example@email.com"
              />
            </div>
            <div>
              <Label htmlFor="phoneNumber">電話番号</Label>
              <Input
                id="phoneNumber"
                value={newParent.phoneNumber}
                onChange={(e) => setNewParent({ ...newParent, phoneNumber: e.target.value })}
                placeholder="090-1234-5678"
              />
            </div>
            <div>
              <Label htmlFor="notes">備考</Label>
              <Input
                id="notes"
                value={newParent.notes}
                onChange={(e) => setNewParent({ ...newParent, notes: e.target.value })}
                placeholder="備考・メモ"
              />
            </div>
            <div>
              <Label>紐づける生徒</Label>
              <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                {students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">生徒が登録されていません</p>
                ) : (
                  students.map((student) => (
                    <div key={student.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`student-${student.id}`}
                        checked={newParent.studentIds.includes(student.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewParent({
                              ...newParent,
                              studentIds: [...newParent.studentIds, student.id],
                            })
                          } else {
                            setNewParent({
                              ...newParent,
                              studentIds: newParent.studentIds.filter((id) => id !== student.id),
                            })
                          }
                        }}
                      />
                      <Label
                        htmlFor={`student-${student.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {student.name}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleAddParent} disabled={!newParent.name.trim()}>
              追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 親御さん編集ダイアログ */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>親御さんを編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">名前 *</Label>
              <Input
                id="edit-name"
                value={newParent.name}
                onChange={(e) => setNewParent({ ...newParent, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-relationship">続柄</Label>
              <Select
                value={newParent.relationship}
                onValueChange={(value: "mother" | "father" | "guardian" | "other") =>
                  setNewParent({ ...newParent, relationship: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mother">母親</SelectItem>
                  <SelectItem value="father">父親</SelectItem>
                  <SelectItem value="guardian">保護者</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-email">メールアドレス</Label>
              <Input
                id="edit-email"
                type="email"
                value={newParent.email}
                onChange={(e) => setNewParent({ ...newParent, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-phoneNumber">電話番号</Label>
              <Input
                id="edit-phoneNumber"
                value={newParent.phoneNumber}
                onChange={(e) => setNewParent({ ...newParent, phoneNumber: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-notes">備考</Label>
              <Input
                id="edit-notes"
                value={newParent.notes}
                onChange={(e) => setNewParent({ ...newParent, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleUpdateParent} disabled={!newParent.name.trim()}>
              更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>親御さんを削除</DialogTitle>
            <DialogDescription>
              {editingParent?.name} を削除してもよろしいですか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDeleteParent}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LINEアカウント紐付けダイアログ */}
      <Dialog open={isLineLinkDialogOpen} onOpenChange={setIsLineLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>LINEアカウントを紐付け</DialogTitle>
            <DialogDescription>
              {linkingParent?.name} のLINEアカウントを紐付けます。
              <br />
              LINE User IDは、Vercelのログから取得できます。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="lineUserId">LINE User ID *</Label>
              <Input
                id="lineUserId"
                value={lineUserId}
                onChange={(e) => setLineUserId(e.target.value)}
                placeholder="U18e99fc3ceb9ef21c6e3ea5caeef6e0b"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Vercelのログから取得したLINE User IDを入力してください
              </p>
            </div>
            <div>
              <Label htmlFor="lineDisplayName">LINE表示名</Label>
              <Input
                id="lineDisplayName"
                value={lineDisplayName}
                onChange={(e) => setLineDisplayName(e.target.value)}
                placeholder={linkingParent?.name || "表示名"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLineLinkDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleLinkLineAccount} disabled={!lineUserId.trim()}>
              紐付け
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 生徒紐付けダイアログ */}
      <Dialog open={isStudentLinkDialogOpen} onOpenChange={setIsStudentLinkDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>生徒を紐付け</DialogTitle>
            <DialogDescription>
              {linkingParent?.name} に紐付ける生徒を選択してください。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
              {students.length === 0 ? (
                <p className="text-sm text-muted-foreground">生徒が登録されていません</p>
              ) : (
                students.map((student) => (
                  <div key={student.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`link-student-${student.id}`}
                      checked={newParent.studentIds.includes(student.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewParent({
                            ...newParent,
                            studentIds: [...newParent.studentIds, student.id],
                          })
                        } else {
                          setNewParent({
                            ...newParent,
                            studentIds: newParent.studentIds.filter((id) => id !== student.id),
                          })
                        }
                      }}
                    />
                    <Label
                      htmlFor={`link-student-${student.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {student.name}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStudentLinkDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleLinkStudent} disabled={newParent.studentIds.length === 0}>
              紐付け
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}

